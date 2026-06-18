import type { ApplicationStatus, ApplicationSource } from "./status";

export type Application = {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  job_description_raw: string | null;
  job_url: string | null;
  location: string | null;
  key_requirements: string[] | null;
  source: ApplicationSource | null;
  status: ApplicationStatus;
  applied_date: string;
  last_status_change: string | null;
  resume_version_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationInsert = Omit<
  Application,
  "id" | "user_id" | "created_at" | "updated_at" | "last_status_change"
>;

export type ApplicationUpdate = Partial<ApplicationInsert>;

export type StatusHistory = {
  id: string;
  application_id: string;
  status: ApplicationStatus;
  changed_at: string;
};

export type FollowUp = {
  id: string;
  application_id: string;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  note: string | null;
};

export type ResumeVersion = {
  id: string;
  user_id: string;
  label: string;
  file_url: string;
  file_size_kb: number | null;
  created_at: string;
};
