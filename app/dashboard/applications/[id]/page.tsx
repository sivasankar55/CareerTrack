"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Application, FollowUp, StatusHistory } from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [isLoading, setIsLoading] = useState(true);

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

    setApplication(appRes.data);
    setStatusHistory(historyRes.data ?? []);
    setFollowUps(followUpRes.data ?? []);
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
              <ul className="space-y-2">
                {followUps.map((fu) => (
                  <li key={fu.id} className="flex items-center justify-between text-sm">
                    <span>
                      {fu.note ? (
                        <span className="text-muted-foreground">{fu.note}</span>
                      ) : (
                        <span className="italic text-muted-foreground">No note</span>
                      )}
                    </span>
                    <span className={fu.completed ? "text-green-600" : "text-amber-600"}>
                      {new Date(fu.due_date).toLocaleDateString()}
                      {fu.completed ? " (done)" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Separator />
            <FollowUpForm applicationId={application.id} onCreated={load} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
