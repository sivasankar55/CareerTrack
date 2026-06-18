"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ApplicationForm } from "../../_components/application-form";
import type { ApplicationFormData } from "../../_components/application-form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NewApplicationPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(data: ApplicationFormData) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in.");
      router.push("/login");
      return;
    }

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
      user_id: user.id,
    };

    if (data.salary_min) payload.salary_min = parseInt(data.salary_min, 10);
    if (data.salary_max) payload.salary_max = parseInt(data.salary_max, 10);
    if (data.equity) payload.equity = data.equity;
    if (data.benefits) payload.benefits = data.benefits;
    if (data.cover_letter_version_id) payload.cover_letter_version_id = data.cover_letter_version_id;

    const { data: app, error } = await supabase
      .from("applications")
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast.error(error.message === 'Could not find the "salary_min" column of "applications" in the schema cache'
        ? "Couldn't save application — run the database migration first (see supabase/migration-v2.sql)."
        : "Couldn't save application. Try again.");
      return;
    }

    if (data.tag_ids.length > 0 && app) {
      const { error: tagErr } = await supabase.from("application_tags").insert(
        data.tag_ids.map((tag_id) => ({
          application_id: app.id,
          tag_id,
        })),
      );
      if (tagErr) {
        console.error("Tags not saved (table may not exist yet):", tagErr);
      }
    }

    toast.success("Application saved.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to applications
      </Link>
      <ApplicationForm onSubmit={handleSubmit} submitLabel="Save application" />
    </div>
  );
}
