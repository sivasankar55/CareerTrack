import type { Application } from "@/types/application";

export function exportApplicationsToCsv(applications: Application[]): void {
  const headers = [
    "Company",
    "Role",
    "Status",
    "Applied Date",
    "Location",
    "Source",
    "Job URL",
    "Key Requirements",
    "Salary Min",
    "Salary Max",
    "Equity",
    "Benefits",
    "Tags",
    "Notes",
  ];

  const rows = applications.map((app) => [
    escapeCsvField(app.company_name),
    escapeCsvField(app.role_title),
    escapeCsvField(app.status),
    app.applied_date,
    escapeCsvField(app.location ?? ""),
    escapeCsvField(app.source ?? ""),
    escapeCsvField(app.job_url ?? ""),
    escapeCsvField(
      app.key_requirements ? app.key_requirements.join("; ") : "",
    ),
    app.salary_min?.toString() ?? "",
    app.salary_max?.toString() ?? "",
    escapeCsvField(app.equity ?? ""),
    escapeCsvField(app.benefits ?? ""),
    escapeCsvField((app as Record<string, unknown>).tags_csv as string ?? ""),
    escapeCsvField(app.notes ?? ""),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `careertrack-export-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
