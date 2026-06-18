"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ApplicationForm } from "../../../_components/application-form";
import type { ApplicationFormData } from "../../../_components/application-form";
import type { Application } from "@/types/application";
import { Loader2 } from "lucide-react";
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

    const { error } = await supabase
      .from("applications")
      .update({
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
      })
      .eq("id", application.id);

    if (error) {
      toast.error("Couldn't save changes. Try again.");
      return;
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
    <div className="mx-auto max-w-2xl">
      <ApplicationForm
        defaultValues={application}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />
    </div>
  );
}
