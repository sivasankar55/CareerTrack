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
import type { Application, ResumeVersion, Tag, CoverLetterVersion } from "@/types/application";
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
  cover_letter_version_id: string;
  salary_min: string;
  salary_max: string;
  equity: string;
  benefits: string;
  tag_ids: string[];
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
  const [coverLetterVersions, setCoverLetterVersions] = useState<CoverLetterVersion[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rvData } = await supabase
        .from("resume_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setResumeVersions(rvData ?? []);

      try {
        const { data: clData } = await supabase
          .from("cover_letter_versions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setCoverLetterVersions(clData ?? []);
      } catch {
        setCoverLetterVersions([]);
      }

      try {
        const { data: tagData } = await supabase
          .from("tags")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true });
        setTags(tagData ?? []);
      } catch {
        setTags([]);
      }

      if (defaultValues) {
        try {
          const { data: appTagData } = await supabase
            .from("application_tags")
            .select("tag_id")
            .eq("application_id", defaultValues.id);
          if (appTagData) {
            const existingTagIds = appTagData.map((at: { tag_id: string }) => at.tag_id);
            setFormData((prev) => ({ ...prev, tag_ids: existingTagIds }));
          }
        } catch {
          // application_tags table may not exist yet
        }
      }
    }
    loadData();
  }, [supabase, defaultValues]);

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
    cover_letter_version_id: defaultValues?.cover_letter_version_id ?? "",
    salary_min: defaultValues?.salary_min?.toString() ?? "",
    salary_max: defaultValues?.salary_max?.toString() ?? "",
    equity: defaultValues?.equity ?? "",
    benefits: defaultValues?.benefits ?? "",
    tag_ids: [],
  });

  function updateField<K extends keyof ApplicationFormData>(
    key: K,
    value: ApplicationFormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTag(tagId: string) {
    setFormData((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
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

  async function handleGenerateCoverLetter() {
    if (!formData.company_name.trim() || !formData.role_title.trim()) {
      toast.error("Fill in company name and role title first.");
      return;
    }

    setIsGeneratingCoverLetter(true);
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: formData.company_name,
          role_title: formData.role_title,
          job_description_raw: formData.job_description_raw,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Couldn't generate cover letter.");
        return;
      }

      const data = await res.json();
      const label = `CL-${formData.company_name}-${formData.role_title}`.replace(/\s+/g, "-").toLowerCase();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in.");
        return;
      }

      const { data: clData, error: clError } = await supabase
        .from("cover_letter_versions")
        .insert({
          user_id: user.id,
          label,
          content: data.cover_letter,
        })
        .select()
        .single();

      if (clError) {
        toast.error("Couldn't save generated cover letter.");
        return;
      }

      const { data: refreshed } = await supabase
        .from("cover_letter_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setCoverLetterVersions(refreshed ?? []);

      if (clData) {
        updateField("cover_letter_version_id", clData.id);
      }

      toast.success("Cover letter generated and attached.");
    } catch {
      toast.error("Couldn't generate cover letter.");
    } finally {
      setIsGeneratingCoverLetter(false);
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salary_min">Salary min</Label>
              <Input
                id="salary_min"
                type="number"
                placeholder="e.g. 100000"
                value={formData.salary_min}
                onChange={(e) => updateField("salary_min", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_max">Salary max</Label>
              <Input
                id="salary_max"
                type="number"
                placeholder="e.g. 150000"
                value={formData.salary_max}
                onChange={(e) => updateField("salary_max", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="equity">Equity</Label>
              <Input
                id="equity"
                placeholder="e.g. 0.1%, $50k over 4 years"
                value={formData.equity}
                onChange={(e) => updateField("equity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits</Label>
              <Input
                id="benefits"
                placeholder="Health insurance, 401k, etc."
                value={formData.benefits}
                onChange={(e) => updateField("benefits", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No tags yet. Create some in the{" "}
                <a href="/dashboard/tags" className="underline underline-offset-2">
                  Tags page
                </a>
                .
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = formData.tag_ids.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isSelected
                          ? "text-white"
                          : "text-muted-foreground border border-input bg-background hover:bg-accent"
                      }`}
                      style={isSelected ? { backgroundColor: tag.color } : undefined}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="resume_version">Resume version</Label>
                <Select
                  key={resumeVersions.length}
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
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="cover_letter_version">Cover letter version</Label>
                <Select
                  key={coverLetterVersions.length}
                  value={formData.cover_letter_version_id}
                  onValueChange={(v) => updateField("cover_letter_version_id", v ?? "")}
                >
                  <SelectTrigger id="cover_letter_version">
                    <SelectValue placeholder="None selected" />
                  </SelectTrigger>
                  <SelectContent>
                    {coverLetterVersions.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>
                        {cl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerateCoverLetter}
                disabled={isGeneratingCoverLetter}
              >
                {isGeneratingCoverLetter ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                Generate draft
              </Button>
            </div>
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
