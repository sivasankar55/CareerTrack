"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Upload, X, Eye } from "lucide-react";
import type { CoverLetterVersion } from "@/types/application";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CoverLetterForm() {
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<CoverLetterVersion[]>([]);
  const [viewContent, setViewContent] = useState<string | null>(null);
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
      .from("cover_letter_versions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setVersions(data ?? []);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    if (!content.trim() && !file) return;

    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated.");
      setIsSaving(false);
      return;
    }

    let filePath: string | null = null;
    let fileSizeKb: number | null = null;

    if (file) {
      filePath = `cover-letters/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("cover-letters")
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        setIsSaving(false);
        return;
      }
      fileSizeKb = Math.round(file.size / 1024);
    }

    const { error: dbError } = await supabase.from("cover_letter_versions").insert({
      user_id: user.id,
      label: label.trim(),
      content: content.trim() || null,
      file_url: filePath,
      file_size_kb: fileSizeKb,
    });

    if (dbError) {
      toast.error("Couldn't save cover letter version.");
      setIsSaving(false);
      return;
    }

    toast.success("Cover letter saved.");
    setLabel("");
    setContent("");
    setFile(null);
    setIsSaving(false);
    loadVersions();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this cover letter version?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("cover_letter_versions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Couldn't delete cover letter version.");
      return;
    }

    toast.success("Cover letter version deleted.");
    loadVersions();
  }

  async function handleDownload(filePath: string) {
    const { data } = await supabase.storage
      .from("cover-letters")
      .createSignedUrl(filePath, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Couldn't generate download link.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSave} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="cl_label">Label</Label>
          <Input
            id="cl_label"
            placeholder="e.g. stripe-application"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cl_content">Content (paste or write below)</Label>
          <Textarea
            id="cl_content"
            placeholder="Paste or write your cover letter here..."
            className="min-h-[150px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cl_file">Or upload a PDF (optional)</Label>
          <Input
            id="cl_file"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save cover letter"}
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
              <div className="flex items-center gap-1">
                {v.content && (
                  <Dialog>
                    <DialogTrigger>
                      <Eye className="h-3.5 w-3.5" />
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{v.label}</DialogTitle>
                      </DialogHeader>
                      <pre className="whitespace-pre-wrap text-sm">{v.content}</pre>
                    </DialogContent>
                  </Dialog>
                )}
                {v.file_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(v.file_url!)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDelete(v.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
