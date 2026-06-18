"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Application } from "@/types/application";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";

type SortKey = "company_name" | "role_title" | "salary_min" | "salary_max" | "applied_date";

export default function OffersPage() {
  const supabase = createClient();
  const [offers, setOffers] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("company_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("status", "offer")
        .order("created_at", { ascending: false });
      setOffers(data ?? []);
      setIsLoading(false);
    }
    load();
  }, [supabase]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...offers].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [offers, sortKey, sortDir]);

  function formatSalary(app: Application): string {
    if (app.salary_min == null && app.salary_max == null) return "-";
    if (app.salary_min != null && app.salary_max != null)
      return `${app.salary_min.toLocaleString()} – ${app.salary_max.toLocaleString()}`;
    return (app.salary_min ?? app.salary_max)?.toLocaleString() ?? "-";
  }

  function SortHeader({ label, sortKey: key }: { label: string; sortKey: SortKey }) {
    const isActive = sortKey === key;
    return (
      <TableHead
        className="cursor-pointer select-none hover:text-foreground"
        onClick={() => toggleSort(key)}
      >
        {label} {isActive ? (sortDir === "asc" ? "▲" : "▼") : ""}
      </TableHead>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold">Offer comparison</h1>

      {offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No offers yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep applying! Offers will appear here when applications reach offer status.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Company" sortKey="company_name" />
                <SortHeader label="Role" sortKey="role_title" />
                <TableHead>Location</TableHead>
                <SortHeader label="Salary" sortKey="salary_min" />
                <TableHead>Equity</TableHead>
                <TableHead>Benefits</TableHead>
                <SortHeader label="Applied" sortKey="applied_date" />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.company_name}</TableCell>
                  <TableCell>{app.role_title}</TableCell>
                  <TableCell className="text-muted-foreground">{app.location ?? "-"}</TableCell>
                  <TableCell>{formatSalary(app)}</TableCell>
                  <TableCell className="text-muted-foreground">{app.equity ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {app.benefits ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(app.applied_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/applications/${app.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
