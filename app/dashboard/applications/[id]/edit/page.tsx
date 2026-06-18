"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ApplicationForm } from "../../../_components/application-form";
import type { ApplicationFormData } from "../../../_components/application-form";
import type { Application } from "@/types/application";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditApplicationPage({ params }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { id } = await params;
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .single();

      setApplication(data);
      setIsLoading(false);
    }
    load();
  }, [params, supabase]);

  async function handleSubmit(data: ApplicationFormData) {
    if (!application) return;

    const payload: Record<string, unknown> = {
      company_name: data.company_name,
      role_title: data.role_title,
      job_description_raw: data.job_description_raw || null,
      job_url: data.job_url || null,
      location: data.location || null,
      key_requirements: data.key_requirements
        ? data.key_requirements.split(",").map((r) => r.trim()).filter(Boolean)
        : null,
      source: data.source || null,
      status: data.status || "applied",
      applied_date: data.applied_date,
      notes: data.notes || null,
    };

    if (data.salary_min) payload.salary_min = parseInt(data.salary_min, 10);
    if (data.salary_max) payload.salary_max = parseInt(data.salary_max, 10);
    if (data.equity) payload.equity = data.equity;
    if (data.benefits) payload.benefits = data.benefits;
    if (data.cover_letter_version_id) payload.cover_letter_version_id = data.cover_letter_version_id;

    const { error } = await supabase
      .from("applications")
      .update(payload)
      .eq("id", application.id);

    if (error) {
      toast.error(error.message.includes("schema cache")
        ? "Couldn't save changes — run the database migration first (see supabase/migration-v2.sql)."
        : "Couldn't save changes. Try again.");
      return;
    }

    if (data.tag_ids) {
      await supabase.from("application_tags").delete().eq("application_id", application.id);
      if (data.tag_ids.length > 0) {
        const { error: tagErr } = await supabase.from("application_tags").insert(
          data.tag_ids.map((tag_id) => ({
            application_id: application.id,
            tag_id,
          })),
        );
        if (tagErr) {
          console.error("Tags not saved (table may not exist yet):", tagErr);
        }
      }
    }

    toast.success("Changes saved.");
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
      <Link
        href={`/dashboard/applications/${application.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>
      <ApplicationForm
        defaultValues={application}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />
    </div>
  );
}
