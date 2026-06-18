"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ApplicationForm } from "../../_components/application-form";
import type { ApplicationFormData } from "../../_components/application-form";
import { toast } from "sonner";

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

    const { error } = await supabase.from("applications").insert({
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
    });

    if (error) {
      toast.error("Couldn't save application. Try again.");
      return;
    }

    toast.success("Application saved.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ApplicationForm onSubmit={handleSubmit} submitLabel="Save application" />
    </div>
  );
}
