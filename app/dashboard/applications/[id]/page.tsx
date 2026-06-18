"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Application,
  FollowUp,
  StatusHistory,
  ResumeVersion,
  Tag,
  InterviewRound,
  CoverLetterVersion,
} from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Pencil,
  Trash2,
  Building,
  MapPin,
  Calendar,
  Loader2,
  History,
  Bell,
  FileText,
  CheckCircle2,
  Circle,
  Save,
  X,
  Download,
  ArrowLeft,
  Tags,
  DollarSign,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { FollowUpForm } from "../../_components/follow-up-form";

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-100 text-blue-800",
  interview: "bg-purple-100 text-purple-800",
  offer: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  ghosted: "bg-gray-100 text-gray-800",
  withdrawn: "bg-yellow-100 text-yellow-800",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function ApplicationDetailPage({ params }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [application, setApplication] = useState<Application | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [resumeVersion, setResumeVersion] = useState<ResumeVersion | null>(null);
  const [coverLetterVersion, setCoverLetterVersion] = useState<CoverLetterVersion | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [interviewRounds, setInterviewRounds] = useState<InterviewRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFollowUp, setEditingFollowUp] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
  const [editingRound, setEditingRound] = useState<string | null>(null);
  const [roundForm, setRoundForm] = useState({
    round_label: "",
    scheduled_date: "",
    questions_asked: "",
    notes: "",
    prep_notes: "",
    rating: "",
  });
  const [isSavingRound, setIsSavingRound] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);

  const load = useCallback(async () => {
    const { id } = await params;

    const [appRes, historyRes, followUpRes] = await Promise.all([
      supabase.from("applications").select("*").eq("id", id).single(),
      supabase
        .from("status_history")
        .select("*")
        .eq("application_id", id)
        .order("changed_at", { ascending: false }),
      supabase
        .from("follow_ups")
        .select("*")
        .eq("application_id", id)
        .order("due_date", { ascending: true }),
    ]);

    const app = appRes.data as Application | null;
    setApplication(app);
    setStatusHistory(historyRes.data ?? []);
    setFollowUps(followUpRes.data ?? []);

    // Load v2 data — gracefully handle if tables don't exist yet
    try {
      const { data: rounds } = await supabase
        .from("interview_rounds")
        .select("*")
        .eq("application_id", id)
        .order("created_at", { ascending: true });
      setInterviewRounds(rounds ?? []);
    } catch {
      setInterviewRounds([]);
    }

    try {
      const { data: tagData } = await supabase.from("tags").select("*");
      const { data: appTagData } = await supabase
        .from("application_tags")
        .select("tag_id")
        .eq("application_id", id);
      if (tagData && appTagData) {
        const tagMap = new Map((tagData as Tag[]).map((t) => [t.id, t]));
        setTags(
          (appTagData as { tag_id: string }[])
            .map((at) => tagMap.get(at.tag_id))
            .filter(Boolean) as Tag[],
        );
      }
    } catch {
      setTags([]);
    }

    if (app?.resume_version_id) {
      const { data: rv } = await supabase
        .from("resume_versions")
        .select("*")
        .eq("id", app.resume_version_id)
        .single();
      setResumeVersion(rv);
    } else {
      setResumeVersion(null);
    }

    if (app?.cover_letter_version_id) {
      try {
        const { data: cl } = await supabase
          .from("cover_letter_versions")
          .select("*")
          .eq("id", app.cover_letter_version_id)
          .single();
        setCoverLetterVersion(cl);
      } catch {
        setCoverLetterVersion(null);
      }
    } else {
      setCoverLetterVersion(null);
    }

    setIsLoading(false);
  }, [params, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!application) return;
    const confirmed = window.confirm(
      `Delete this application to ${application.company_name}?`,
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", application.id);

    if (error) {
      toast.error("Couldn't delete application.");
      return;
    }

    toast.success("Application deleted.");
    router.push("/dashboard");
    router.refresh();
  }

  async function handleToggleFollowUp(fu: FollowUp) {
    const updates: Partial<FollowUp> = {
      completed: !fu.completed,
      completed_at: !fu.completed ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from("follow_ups")
      .update(updates)
      .eq("id", fu.id);

    if (error) {
      toast.error("Couldn't update follow-up.");
      return;
    }
    load();
  }

  function startEditFollowUp(fu: FollowUp) {
    setEditingFollowUp(fu.id);
    setEditDueDate(fu.due_date);
    setEditNote(fu.note ?? "");
  }

  function cancelEditFollowUp() {
    setEditingFollowUp(null);
    setEditDueDate("");
    setEditNote("");
  }

  async function handleSaveFollowUp(fuId: string) {
    setIsSavingFollowUp(true);
    const { error } = await supabase
      .from("follow_ups")
      .update({
        due_date: editDueDate,
        note: editNote || null,
      })
      .eq("id", fuId);

    if (error) {
      toast.error("Couldn't save follow-up changes.");
      setIsSavingFollowUp(false);
      return;
    }

    toast.success("Follow-up updated.");
    setIsSavingFollowUp(false);
    cancelEditFollowUp();
    load();
  }

  async function handleDeleteFollowUp(fuId: string) {
    const confirmed = window.confirm("Delete this follow-up reminder?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("follow_ups")
      .delete()
      .eq("id", fuId);

    if (error) {
      toast.error("Couldn't delete follow-up.");
      return;
    }

    toast.success("Follow-up deleted.");
    load();
  }

  async function handleDownloadResume(filePath: string) {
    const { data } = await supabase.storage
      .from("resumes")
      .createSignedUrl(filePath, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Couldn't generate download link.");
    }
  }

  async function handleDownloadCoverLetter(filePath: string) {
    const { data } = await supabase.storage
      .from("cover-letters")
      .createSignedUrl(filePath, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Couldn't generate download link.");
    }
  }

  function resetRoundForm() {
    setRoundForm({
      round_label: "",
      scheduled_date: "",
      questions_asked: "",
      notes: "",
      prep_notes: "",
      rating: "",
    });
  }

  async function handleAddRound() {
    if (!roundForm.round_label.trim() || !application) return;
    setIsSavingRound(true);
    const { error } = await supabase.from("interview_rounds").insert({
      application_id: application.id,
      round_label: roundForm.round_label.trim(),
      scheduled_date: roundForm.scheduled_date || null,
      questions_asked: roundForm.questions_asked || null,
      notes: roundForm.notes || null,
      prep_notes: roundForm.prep_notes || null,
      rating: roundForm.rating ? parseInt(roundForm.rating, 10) : null,
    });
    if (error) {
      toast.error("Couldn't add interview round.");
      setIsSavingRound(false);
      return;
    }
    toast.success("Interview round added.");
    resetRoundForm();
    setIsSavingRound(false);
    load();
  }

  function startEditRound(round: InterviewRound) {
    setEditingRound(round.id);
    setRoundForm({
      round_label: round.round_label,
      scheduled_date: round.scheduled_date ?? "",
      questions_asked: round.questions_asked ?? "",
      notes: round.notes ?? "",
      prep_notes: round.prep_notes ?? "",
      rating: round.rating?.toString() ?? "",
    });
  }

  function cancelEditRound() {
    setEditingRound(null);
    resetRoundForm();
  }

  async function handleSaveRound(roundId: string) {
    if (!roundForm.round_label.trim()) return;
    setIsSavingRound(true);
    const { error } = await supabase
      .from("interview_rounds")
      .update({
        round_label: roundForm.round_label.trim(),
        scheduled_date: roundForm.scheduled_date || null,
        questions_asked: roundForm.questions_asked || null,
        notes: roundForm.notes || null,
        prep_notes: roundForm.prep_notes || null,
        rating: roundForm.rating ? parseInt(roundForm.rating, 10) : null,
      })
      .eq("id", roundId);
    if (error) {
      toast.error("Couldn't save interview round.");
      setIsSavingRound(false);
      return;
    }
    toast.success("Interview round updated.");
    setEditingRound(null);
    resetRoundForm();
    setIsSavingRound(false);
    load();
  }

  async function handleDeleteRound(roundId: string) {
    const confirmed = window.confirm("Delete this interview round?");
    if (!confirmed) return;
    const { error } = await supabase.from("interview_rounds").delete().eq("id", roundId);
    if (error) {
      toast.error("Couldn't delete interview round.");
      return;
    }
    toast.success("Interview round deleted.");
    load();
  }

  function formatSalary(app: Application): string | null {
    if (app.salary_min == null && app.salary_max == null) return null;
    if (app.salary_min != null && app.salary_max != null)
      return `${app.salary_min.toLocaleString()} – ${app.salary_max.toLocaleString()}`;
    return (app.salary_min ?? app.salary_max)?.toLocaleString() ?? null;
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`inline-block h-3.5 w-3.5 ${
          i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
        }`}
      />
    ));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Application not found.</p>
      </div>
    );
  }

  const salaryStr = formatSalary(application);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to applications
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{application.role_title}</h1>
          <p className="text-muted-foreground">{application.company_name}</p>
        </div>
        <Badge
          variant="secondary"
          className={STATUS_COLORS[application.status]}
        >
          {application.status}
        </Badge>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/dashboard/applications/${application.id}/edit`}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
        {application.job_url && (
          <a
            href={application.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open job link
          </a>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>{application.company_name}</span>
          </div>
          {application.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{application.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Applied {new Date(application.applied_date).toLocaleDateString()}</span>
          </div>
          {application.source && (
            <p>
              <span className="text-muted-foreground">Source: </span>
              {application.source}
            </p>
          )}
          {salaryStr && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{salaryStr}</span>
            </div>
          )}
          {application.equity && (
            <p>
              <span className="text-muted-foreground">Equity: </span>
              {application.equity}
            </p>
          )}
          {application.benefits && (
            <p>
              <span className="text-muted-foreground">Benefits: </span>
              {application.benefits}
            </p>
          )}
          {resumeVersion && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Resume: </span>
              <span>{resumeVersion.label}</span>
              <button
                type="button"
                onClick={() => handleDownloadResume(resumeVersion.file_url)}
                className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
              >
                <Download className="h-3 w-3" />
                Download
              </button>
            </div>
          )}
          {coverLetterVersion && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Cover letter: </span>
              <span>{coverLetterVersion.label}</span>
              <button
                type="button"
                onClick={() => setShowCoverLetter(true)}
                className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
              >
                View
              </button>
              <Dialog open={showCoverLetter} onOpenChange={setShowCoverLetter}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{coverLetterVersion.label}</DialogTitle>
                  </DialogHeader>
                  <pre className="whitespace-pre-wrap text-sm">
                    {coverLetterVersion.content}
                  </pre>
                </DialogContent>
              </Dialog>
              {coverLetterVersion.file_url && (
                <button
                  type="button"
                  onClick={() => handleDownloadCoverLetter(coverLetterVersion.file_url!)}
                  className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {application.key_requirements &&
        application.key_requirements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key requirements</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {application.key_requirements.map((req) => (
                <Badge key={req} variant="secondary">
                  {req}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

      {application.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{application.notes}</p>
          </CardContent>
        </Card>
      )}

      {application.job_description_raw && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job description</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
              {application.job_description_raw}
            </pre>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Status history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <ul className="space-y-2">
                {statusHistory.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between text-sm">
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[entry.status]}
                    >
                      {entry.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(entry.changed_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups yet.</p>
            ) : (
              <ul className="space-y-3">
                {followUps.map((fu) => (
                  <li key={fu.id} className="rounded-md border px-3 py-2">
                    {editingFollowUp === fu.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Due date</label>
                          <Input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Note</label>
                          <Textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="mt-1 min-h-[60px]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveFollowUp(fu.id)}
                            disabled={isSavingFollowUp}
                          >
                            <Save className="mr-1 h-3 w-3" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditFollowUp}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleFollowUp(fu)}
                          className="shrink-0"
                          title={fu.completed ? "Mark as pending" : "Mark as done"}
                        >
                          {fu.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          {fu.note ? (
                            <p className="text-sm">{fu.note}</p>
                          ) : (
                            <p className="text-sm italic text-muted-foreground">No note</p>
                          )}
                          <p
                            className={`text-xs ${
                              fu.completed ? "text-green-600" : "text-amber-600"
                            }`}
                          >
                            {new Date(fu.due_date).toLocaleDateString()}
                            {fu.completed ? " (done)" : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditFollowUp(fu)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDeleteFollowUp(fu.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Separator />
            <FollowUpForm
              applicationId={application.id}
              onCreated={load}
              companyName={application.company_name}
              roleTitle={application.role_title}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Interview rounds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {interviewRounds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interview rounds yet.</p>
          ) : (
            <ul className="space-y-3">
              {interviewRounds.map((round) => (
                <li key={round.id} className="rounded-md border px-4 py-3">
                  {editingRound === round.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Round label</label>
                          <Input
                            value={roundForm.round_label}
                            onChange={(e) => setRoundForm((f) => ({ ...f, round_label: e.target.value }))}
                            className="mt-1"
                            placeholder="e.g. Phone Screen"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Scheduled date</label>
                          <Input
                            type="date"
                            value={roundForm.scheduled_date}
                            onChange={(e) => setRoundForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Prep notes</label>
                        <Textarea
                          value={roundForm.prep_notes}
                          onChange={(e) => setRoundForm((f) => ({ ...f, prep_notes: e.target.value }))}
                          className="mt-1 min-h-[60px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Questions asked</label>
                        <Textarea
                          value={roundForm.questions_asked}
                          onChange={(e) => setRoundForm((f) => ({ ...f, questions_asked: e.target.value }))}
                          className="mt-1 min-h-[60px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Post-interview notes</label>
                        <Textarea
                          value={roundForm.notes}
                          onChange={(e) => setRoundForm((f) => ({ ...f, notes: e.target.value }))}
                          className="mt-1 min-h-[60px]"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Rating (1-5)</label>
                          <Select
                            value={roundForm.rating}
                            onValueChange={(v) => setRoundForm((f) => ({ ...f, rating: v ?? "" }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="No rating" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={n.toString()}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveRound(round.id)}
                          disabled={isSavingRound}
                        >
                          <Save className="mr-1 h-3 w-3" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditRound}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{round.round_label}</span>
                          {round.scheduled_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(round.scheduled_date).toLocaleDateString()}
                            </span>
                          )}
                          {round.rating && (
                            <span className="inline-flex items-center gap-0.5">
                              {renderStars(round.rating)}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditRound(round)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDeleteRound(round.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {round.prep_notes && (
                        <details className="group text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-xs font-medium">
                            Prep notes
                          </summary>
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                            {round.prep_notes}
                          </p>
                        </details>
                      )}
                      {round.questions_asked && (
                        <details className="group text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-xs font-medium">
                            Questions asked
                          </summary>
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                            {round.questions_asked}
                          </p>
                        </details>
                      )}
                      {round.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Notes</p>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm">
                            {round.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium">Add interview round</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Round label *</label>
                <Input
                  value={roundForm.round_label}
                  onChange={(e) => setRoundForm((f) => ({ ...f, round_label: e.target.value }))}
                  className="mt-1"
                  placeholder="e.g. Phone Screen"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Scheduled date</label>
                <Input
                  type="date"
                  value={roundForm.scheduled_date}
                  onChange={(e) => setRoundForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Prep notes</label>
              <Textarea
                value={roundForm.prep_notes}
                onChange={(e) => setRoundForm((f) => ({ ...f, prep_notes: e.target.value }))}
                className="mt-1 min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Questions asked</label>
              <Textarea
                value={roundForm.questions_asked}
                onChange={(e) => setRoundForm((f) => ({ ...f, questions_asked: e.target.value }))}
                className="mt-1 min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Post-interview notes</label>
              <Textarea
                value={roundForm.notes}
                onChange={(e) => setRoundForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 min-h-[60px]"
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Rating (1-5)</label>
                <Select
                  value={roundForm.rating}
                   onValueChange={(v) => setRoundForm((f) => ({ ...f, rating: v ?? "" }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="No rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleAddRound}
                disabled={isSavingRound || !roundForm.round_label.trim()}
              >
                Add round
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
