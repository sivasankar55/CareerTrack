"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Application, Tag } from "@/types/application";
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
  tagFilterIds: string[] = [],
  appTagMap: Map<string, string[]> = new Map(),
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

    const matchesTags =
      tagFilterIds.length === 0 ||
      (appTagMap.has(app.id) &&
        tagFilterIds.every((tid) => appTagMap.get(app.id)!.includes(tid)));

    return matchesStatus && matchesSearch && matchesTags;
  });
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("tags")
          .select("*")
          .order("name", { ascending: true });
        setTags(data ?? []);
      } catch {
        // tags table may not exist yet
      }
    }
    load();
  }, [supabase]);

  return { tags };
}
