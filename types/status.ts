export const APPLICATION_STATUSES = [
  "applied",
  "interview",
  "offer",
  "rejected",
  "ghosted",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const SOURCE_OPTIONS = [
  "LinkedIn",
  "Naukri",
  "Indeed",
  "Company site",
  "Referral",
  "Other",
] as const;

export type ApplicationSource = (typeof SOURCE_OPTIONS)[number];
