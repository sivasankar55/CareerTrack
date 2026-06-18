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
  cover_letter_version_id: string | null;
  salary_min: number | null;
  salary_max: number | null;
  equity: string | null;
  benefits: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationInsert = Omit<
  Application,
  "id" | "user_id" | "created_at" | "updated_at" | "last_status_change"
>;

export type ApplicationUpdate = Partial<ApplicationInsert>;

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type ApplicationTag = {
  application_id: string;
  tag_id: string;
  created_at: string;
};

export type InterviewRound = {
  id: string;
  application_id: string;
  round_label: string;
  scheduled_date: string | null;
  questions_asked: string | null;
  notes: string | null;
  prep_notes: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
};

export type CoverLetterVersion = {
  id: string;
  user_id: string;
  label: string;
  content: string | null;
  file_url: string | null;
  file_size_kb: number | null;
  created_at: string;
};

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
