"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useApplications, useFilteredApplications, useTags } from "@/hooks/use-applications";
import { StatusFilter } from "./_components/status-filter";
import { SearchBar } from "./_components/search-bar";
import { ApplicationCard } from "./_components/application-card";
import { Button } from "@/components/ui/button";
import type { ApplicationStatus } from "@/types/status";
import type { Application, Tag } from "@/types/application";
import { exportApplicationsToCsv } from "@/lib/csv";
import { Plus, Loader2, Download, X } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const { applications, isLoading, deleteApplication } = useApplications();
  const { tags } = useTags();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [avgDaysToResponse, setAvgDaysToResponse] = useState<number | null>(null);
  const [appTagMap, setAppTagMap] = useState<Map<string, string[]>>(new Map());
  const supabase = createClient();

  useEffect(() => {
    if (applications.length === 0) return;

    async function loadAppTags() {
      try {
        const appIds = applications.map((a) => a.id);
        const { data } = await supabase
          .from("application_tags")
          .select("*")
          .in("application_id", appIds);

        if (data) {
          const map = new Map<string, string[]>();
          for (const at of data) {
            const existing = map.get(at.application_id) ?? [];
            existing.push(at.tag_id);
            map.set(at.application_id, existing);
          }
          setAppTagMap(map);
        }
      } catch {
        // application_tags table may not exist yet
      }
    }

    loadAppTags();
  }, [applications, supabase]);

  useEffect(() => {
    if (applications.length === 0) return;

    async function computeAvgDays() {
      const appIds = applications.map((a) => a.id);
      const { data: history } = await supabase
        .from("status_history")
        .select("*")
        .in("application_id", appIds)
        .order("changed_at", { ascending: true });

      if (!history || history.length === 0) return;

      const daysList: number[] = [];
      const firstResponsePerApp = new Map<string, string>();

      for (const entry of history) {
        if (
          ["interview", "offer", "rejected"].includes(entry.status) &&
          !firstResponsePerApp.has(entry.application_id)
        ) {
          firstResponsePerApp.set(entry.application_id, entry.changed_at);
        }
      }

      for (const app of applications) {
        if (["ghosted", "withdrawn"].includes(app.status)) continue;
        const responseTime = firstResponsePerApp.get(app.id);
        if (responseTime) {
          const diffMs = new Date(responseTime).getTime() - new Date(app.applied_date).getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          daysList.push(diffDays);
        }
      }

      if (daysList.length > 0) {
        setAvgDaysToResponse(Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length));
      }
    }

    computeAvgDays();
  }, [applications, supabase]);

  const filtered = useFilteredApplications(
    applications,
    statusFilter,
    searchQuery,
    selectedTagIds,
    appTagMap,
  );

  async function handleDelete(id: string) {
    const app = applications.find((a) => a.id === id);
    if (!app) return;

    const confirmed = window.confirm(
      `Delete this application to ${app.company_name}?`,
    );
    if (!confirmed) return;

    const { error } = await deleteApplication(id);
    if (error) {
      toast.error("Couldn't delete application — please try again.");
    } else {
      toast.success("Application deleted.");
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  }

  const funnelData = useMemo(() => {
    if (applications.length === 0) return [];
    const statuses = ["applied", "interview", "offer", "rejected", "ghosted", "withdrawn"];
    return statuses.map((s) => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      count: applications.filter((a) => a.status === s).length,
    }));
  }, [applications]);

  const timelineData = useMemo(() => {
    if (applications.length === 0) return [];
    const monthMap = new Map<string, number>();
    for (const app of applications) {
      const month = app.applied_date.substring(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    }
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month,
        Applications: count,
      }));
  }, [applications]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function getStats() {
    const total = applications.length;
    if (total === 0) return null;
    const offers = applications.filter((a) => a.status === "offer").length;
    const interviews = applications.filter((a) => a.status === "interview").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    const ghosted = applications.filter((a) => a.status === "ghosted").length;
    const responseRate = total - ghosted > 0
      ? Math.round(((offers + interviews + rejected) / (total - ghosted)) * 100)
      : 0;
    return { total, offers, interviews, rejected, ghosted, responseRate };
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Applications</h1>
        <div className="flex gap-2">
          {applications.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => exportApplicationsToCsv(applications)}>
              <Download className="mr-1 h-4 w-4" />
              CSV export
            </Button>
          )}
          <Link
            href="/dashboard/applications/new"
            className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add application
          </Link>
        </div>
      </div>

      {stats && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-muted-foreground">
            Total: <strong>{stats.total}</strong>
          </span>
          <span className="text-green-600">
            Offers: <strong>{stats.offers}</strong>
          </span>
          <span className="text-purple-600">
            Interviews: <strong>{stats.interviews}</strong>
          </span>
          <span className="text-red-600">
            Rejected: <strong>{stats.rejected}</strong>
          </span>
          <span className="text-gray-500">
            Ghosted: <strong>{stats.ghosted}</strong>
          </span>
          <span className="text-muted-foreground">
            Response rate: <strong>{stats.responseRate}%</strong>
          </span>
          {avgDaysToResponse !== null && (
            <span className="text-muted-foreground">
              Avg response: <strong>{avgDaysToResponse} days</strong>
            </span>
          )}
        </div>
      )}

      {applications.length >= 3 && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Pipeline breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(221.2 83.2% 53.3%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Applications over time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="Applications"
                  stroke="hsl(221.2 83.2% 53.3%)"
                  fill="hsl(221.2 83.2% 53.3%)"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {applications.length > 0 && applications.length < 3 && (
        <p className="text-center text-sm text-muted-foreground">
          Add a few more applications to see your search trends.
        </p>
      )}

      <div className="space-y-4">
        <StatusFilter selected={statusFilter} onSelect={setStatusFilter} />
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Tags:</span>
            {tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "text-white"
                      : "border border-input bg-background text-muted-foreground hover:bg-accent"
                  }`}
                  style={isSelected ? { backgroundColor: tag.color } : undefined}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              );
            })}
            {selectedTagIds.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedTagIds([])}
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>
        )}
        <div className="max-w-sm">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No applications yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a job description to get started.
          </p>
          <Link
            href="/dashboard/applications/new"
            className="mt-4 inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add application
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {applications.length} applications
          </p>
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
