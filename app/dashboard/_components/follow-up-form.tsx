"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { FOLLOW_UP_TEMPLATES, renderTemplate } from "@/lib/follow-up-templates";
import type { FollowUpTemplate } from "@/lib/follow-up-templates";

type FollowUpFormProps = {
  applicationId: string;
  onCreated: () => void;
  companyName?: string;
  roleTitle?: string;
};

export function FollowUpForm({ applicationId, onCreated, companyName, roleTitle }: FollowUpFormProps) {
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  function handleTemplateSelect(templateId: string | null) {
    if (!templateId) return;
    setSelectedTemplate(templateId);
    if (templateId === "custom") {
      setNote("");
      return;
    }
    const template = FOLLOW_UP_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setNote(renderTemplate(template, companyName ?? "the company", roleTitle ?? "the role"));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dueDate) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("follow_ups").insert({
      application_id: applicationId,
      due_date: dueDate,
      note: note || null,
    });

    if (error) {
      toast.error("Couldn't add follow-up. Try again.");
      setIsSubmitting(false);
      return;
    }

    toast.success("Follow-up added.");
    setDueDate("");
    setNote("");
    setSelectedTemplate("");
    setIsSubmitting(false);
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="due_date">Remind me on</Label>
          <Input
            id="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="fu_template">Template (optional)</Label>
        <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
          <SelectTrigger id="fu_template">
            <SelectValue placeholder="Select a template..." />
          </SelectTrigger>
          <SelectContent>
            {FOLLOW_UP_TEMPLATES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="fu_note">Note</Label>
        <Textarea
          id="fu_note"
          placeholder="What to follow up about..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add follow-up
      </Button>
    </form>
  );
}
