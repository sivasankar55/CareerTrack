"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Application } from "@/types/application";
import type { ApplicationStatus } from "@/types/status";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setApplications(data ?? []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const deleteApplication = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id);

      if (!error) {
        setApplications((prev) => prev.filter((a) => a.id !== id));
      }

      return { error };
    },
    [supabase],
  );

  return {
    applications,
    isLoading,
    error,
    refetch: fetchApplications,
    deleteApplication,
  };
}

export function useFilteredApplications(
  applications: Application[],
  statusFilter: ApplicationStatus | null,
  searchQuery: string,
) {
  return applications.filter((app) => {
    const matchesStatus = !statusFilter || app.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      app.company_name.toLowerCase().includes(query) ||
      app.role_title.toLowerCase().includes(query) ||
      (app.key_requirements &&
        app.key_requirements.some((r) => r.toLowerCase().includes(query)));

    return matchesStatus && matchesSearch;
  });
}
