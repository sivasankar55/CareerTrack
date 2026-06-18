"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import type { ResumeVersion } from "@/types/application";

type ResumeUploadFormProps = {
  onUploaded: () => void;
};

export function ResumeUploadForm({ onUploaded }: ResumeUploadFormProps) {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("resume_versions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setVersions(data ?? []);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !label.trim()) return;

    setIsUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated.");
      setIsUploading(false);
      return;
    }

    const filePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, file);

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      setIsUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("resume_versions").insert({
      user_id: user.id,
      label: label.trim(),
      file_url: filePath,
      file_size_kb: Math.round(file.size / 1024),
    });

    if (dbError) {
      toast.error("Couldn't save resume version.");
      setIsUploading(false);
      return;
    }

    toast.success("Resume uploaded.");
    setLabel("");
    setFile(null);
    setIsUploading(false);
    loadVersions();
    onUploaded();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this resume version?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("resume_versions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Couldn't delete resume version.");
      return;
    }

    toast.success("Resume version deleted.");
    loadVersions();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="resume_label">Label</Label>
          <Input
            id="resume_label"
            placeholder="e.g. v3-backend-focus"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="resume_file">PDF file</Label>
          <Input
            id="resume_file"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={isUploading}>
          <Upload className="mr-1 h-3.5 w-3.5" />
          {isUploading ? "Uploading..." : "Upload resume"}
        </Button>
      </form>

      {versions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Saved versions</p>
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{v.label}</p>
                {v.file_size_kb && (
                  <p className="text-xs text-muted-foreground">
                    {v.file_size_kb} KB
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDelete(v.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
