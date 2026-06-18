"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { APPLICATION_STATUSES } from "@/types/status";
import { SOURCE_OPTIONS } from "@/types/status";
import type { Application, ResumeVersion } from "@/types/application";
import type { ApplicationStatus, ApplicationSource } from "@/types/status";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export type ApplicationFormData = {
  company_name: string;
  role_title: string;
  job_description_raw: string;
  job_url: string;
  location: string;
  key_requirements: string;
  source: ApplicationSource | "";
  status: ApplicationStatus | "";
  applied_date: string;
  notes: string;
  resume_version_id: string;
};

type Props = {
  defaultValues?: Application;
  onSubmit: (data: ApplicationFormData) => Promise<void>;
  submitLabel: string;
};

export function ApplicationForm({ defaultValues, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadResumes() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("resume_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setResumeVersions(data ?? []);
    }
    loadResumes();
  }, [supabase]);
  const [formData, setFormData] = useState<ApplicationFormData>({
    company_name: defaultValues?.company_name ?? "",
    role_title: defaultValues?.role_title ?? "",
    job_description_raw: defaultValues?.job_description_raw ?? "",
    job_url: defaultValues?.job_url ?? "",
    location: defaultValues?.location ?? "",
    key_requirements: defaultValues?.key_requirements?.join(", ") ?? "",
    source: (defaultValues?.source as ApplicationSource) ?? "",
    status: (defaultValues?.status as ApplicationStatus) ?? "applied",
    applied_date: defaultValues?.applied_date ?? new Date().toISOString().split("T")[0],
    notes: defaultValues?.notes ?? "",
    resume_version_id: defaultValues?.resume_version_id ?? "",
  });

  function updateField<K extends keyof ApplicationFormData>(
    key: K,
    value: ApplicationFormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleExtract() {
    if (!formData.job_description_raw.trim()) {
      toast.error("Paste a job description first before using auto-fill.");
      return;
    }

    setIsExtracting(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_text: formData.job_description_raw }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Extraction failed. Please fill in the fields manually.");
        return;
      }

      const data = await res.json();
      updateField("company_name", data.company_name ?? "");
      updateField("role_title", data.role_title ?? "");
      updateField("location", data.location ?? "");
      updateField(
        "key_requirements",
        Array.isArray(data.key_requirements)
          ? data.key_requirements.join(", ")
          : "",
      );
      toast.success("Fields auto-filled — review before saving.");
    } catch {
      toast.error("Couldn't reach the extraction service. Fill in fields manually.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch {
      toast.error("Something went wrong saving the application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{submitLabel}</CardTitle>
          <CardDescription>
            Paste a job description and use auto-fill, or enter details manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="jd">Job description</Label>
            <div className="space-y-2">
              <Textarea
                id="jd"
                placeholder="Paste the full job description here..."
                className="min-h-[120px]"
                value={formData.job_description_raw}
                onChange={(e) => updateField("job_description_raw", e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleExtract}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                Auto-fill from description
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Company name *</Label>
              <Input
                id="company"
                required
                value={formData.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role title *</Label>
              <Input
                id="role"
                required
                value={formData.role_title}
                onChange={(e) => updateField("role_title", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_url">Job URL</Label>
              <Input
                id="job_url"
                type="url"
                placeholder="https://linkedin.com/jobs/..."
                value={formData.job_url}
                onChange={(e) => updateField("job_url", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Key requirements</Label>
            <Input
              id="requirements"
              placeholder="React, 3+ yrs, GraphQL (comma-separated)"
              value={formData.key_requirements}
              onChange={(e) => updateField("key_requirements", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => updateField("status", v as ApplicationStatus)}
                required
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => updateField("source", v as ApplicationSource)}
              >
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="applied_date">Applied date *</Label>
              <Input
                id="applied_date"
                type="date"
                required
                value={formData.applied_date}
                onChange={(e) => updateField("applied_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume_version">Resume version</Label>
            <Select
              value={formData.resume_version_id}
              onValueChange={(v) => updateField("resume_version_id", v ?? "")}
            >
              <SelectTrigger id="resume_version">
                <SelectValue placeholder="None selected" />
              </SelectTrigger>
              <SelectContent>
                {resumeVersions.map((rv) => (
                  <SelectItem key={rv.id} value={rv.id}>
                    {rv.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this application..."
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
