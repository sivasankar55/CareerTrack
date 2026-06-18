import { createClient } from "@/lib/supabase/server";
import type { ApplicationInsert, ApplicationUpdate } from "@/types/application";
import type { ApplicationStatus } from "@/types/status";
import { revalidatePath } from "next/cache";

export async function createApplication(data: ApplicationInsert) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase.from("applications").insert({
    ...data,
    user_id: user.id,
  });

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function updateApplication(
  id: string,
  data: ApplicationUpdate,
  previousStatus: ApplicationStatus,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const payload: Record<string, unknown> = { ...data };

  if (data.status && data.status !== previousStatus) {
    payload.last_status_change = new Date().toISOString();
  }

  const { error } = await supabase
    .from("applications")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/applications/${id}`);
}

export async function deleteApplication(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function getApplication(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function getResumeVersions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
