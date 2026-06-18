"use client";

import { useState } from "react";
import Link from "next/link";
import { useApplications, useFilteredApplications } from "@/hooks/use-applications";
import { StatusFilter } from "./_components/status-filter";
import { SearchBar } from "./_components/search-bar";
import { ApplicationCard } from "./_components/application-card";
import { Button } from "@/components/ui/button";
import type { ApplicationStatus } from "@/types/status";
import { exportApplicationsToCsv } from "@/lib/csv";
import { Plus, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { applications, isLoading, deleteApplication } = useApplications();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useFilteredApplications(applications, statusFilter, searchQuery);

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
        </div>
      )}

      <div className="space-y-4">
        <StatusFilter selected={statusFilter} onSelect={setStatusFilter} />
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
