"use client";

import type { ApplicationStatus } from "@/types/status";
import { APPLICATION_STATUSES } from "@/types/status";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
  withdrawn: "Withdrawn",
};

type StatusFilterProps = {
  selected: ApplicationStatus | null;
  onSelect: (status: ApplicationStatus | null) => void;
};

export function StatusFilter({ selected, onSelect }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selected === null ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect(null)}
      >
        All
      </Button>
      {APPLICATION_STATUSES.map((status) => (
        <Button
          key={status}
          variant={selected === status ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(status)}
        >
          {STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}
