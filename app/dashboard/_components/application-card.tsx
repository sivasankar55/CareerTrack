"use client";

import Link from "next/link";
import type { Application } from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ExternalLink, Pencil, Trash2, Building, MapPin, Calendar } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-100 text-blue-800",
  interview: "bg-purple-100 text-purple-800",
  offer: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  ghosted: "bg-gray-100 text-gray-800",
  withdrawn: "bg-yellow-100 text-yellow-800",
};

type ApplicationCardProps = {
  application: Application;
  onDelete: (id: string) => void;
};

export function ApplicationCard({ application, onDelete }: ApplicationCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-base sm:text-lg leading-tight">
              {application.role_title}
            </h3>
            <Badge
              variant="secondary"
              className={`${STATUS_COLORS[application.status]} capitalize`}
            >
              {application.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-muted-foreground/80" />
              {application.company_name}
            </span>
            {application.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" />
                {application.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
              {new Date(application.applied_date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {application.key_requirements &&
          application.key_requirements.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {application.key_requirements.map((req) => (
                <Badge key={req} variant="outline" className="text-[10px] sm:text-xs">
                  {req}
                </Badge>
              ))}
            </div>
          )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center pt-2">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/applications/${application.id}/edit`}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
          {application.job_url && (
            <a
              href={application.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Link
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(application.id)}
            className="flex-1 sm:flex-none"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />
            Delete
          </Button>
        </div>
        <Link
          href={`/dashboard/applications/${application.id}`}
          className="inline-flex items-center justify-center gap-1 rounded-md border sm:border-0 border-input bg-muted/20 sm:bg-transparent px-2.5 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground text-center"
        >
          View details
        </Link>
      </CardFooter>
    </Card>
  );
}
