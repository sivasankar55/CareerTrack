"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type FollowUpFormProps = {
  applicationId: string;
  onCreated: () => void;
};

export function FollowUpForm({ applicationId, onCreated }: FollowUpFormProps) {
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

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
        <Label htmlFor="fu_note">Note (optional)</Label>
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
