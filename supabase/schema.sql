-- CareerTrack schema migration
-- Run this in the Supabase SQL editor

-- 1. Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- 2. Create tables

create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  file_url text not null,
  file_size_kb int,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  role_title text not null,
  job_description_raw text,
  job_url text,
  location text,
  key_requirements jsonb,
  source text check (source in ('LinkedIn', 'Naukri', 'Indeed', 'Company site', 'Referral', 'Other')),
  status text not null check (status in ('applied', 'interview', 'offer', 'rejected', 'ghosted', 'withdrawn')) default 'applied',
  applied_date date not null,
  last_status_change timestamptz,
  resume_version_id uuid references public.resume_versions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  due_date date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  status text not null check (status in ('applied', 'interview', 'offer', 'rejected', 'ghosted', 'withdrawn')),
  changed_at timestamptz not null default now()
);

create table if not exists public.extraction_cache (
  jd_hash text primary key,
  extracted_json jsonb not null,
  created_at timestamptz not null default now()
);

-- 3. Enable RLS on all tables
alter table public.applications enable row level security;
alter table public.resume_versions enable row level security;
alter table public.follow_ups enable row level security;
alter table public.status_history enable row level security;
-- extraction_cache has no user_id, RLS not needed

-- 4. RLS policies — each table scoped to auth.uid()

-- applications
create policy "Users can view own applications"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id);

create policy "Users can delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

-- resume_versions
create policy "Users can view own resume versions"
  on public.resume_versions for select
  using (auth.uid() = user_id);

create policy "Users can insert own resume versions"
  on public.resume_versions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own resume versions"
  on public.resume_versions for update
  using (auth.uid() = user_id);

create policy "Users can delete own resume versions"
  on public.resume_versions for delete
  using (auth.uid() = user_id);

-- follow_ups (via application ownership)
create policy "Users can view own follow_ups"
  on public.follow_ups for select
  using (
    exists (
      select 1 from public.applications
      where applications.id = follow_ups.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users can insert own follow_ups"
  on public.follow_ups for insert
  with check (
    exists (
      select 1 from public.applications
      where applications.id = follow_ups.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users can update own follow_ups"
  on public.follow_ups for update
  using (
    exists (
      select 1 from public.applications
      where applications.id = follow_ups.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users can delete own follow_ups"
  on public.follow_ups for delete
  using (
    exists (
      select 1 from public.applications
      where applications.id = follow_ups.application_id
      and applications.user_id = auth.uid()
    )
  );

-- status_history (via application ownership)
create policy "Users can view own status_history"
  on public.status_history for select
  using (
    exists (
      select 1 from public.applications
      where applications.id = status_history.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users can insert own status_history"
  on public.status_history for insert
  with check (
    exists (
      select 1 from public.applications
      where applications.id = status_history.application_id
      and applications.user_id = auth.uid()
    )
  );

-- 5. Function + trigger to auto-update updated_at and log status changes

create or replace function public.handle_application_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- update the updated_at timestamp
  new.updated_at = now();

  -- if status changed, log to status_history and update last_status_change
  if old.status is distinct from new.status then
    new.last_status_change = now();
    insert into public.status_history (application_id, status)
    values (new.id, new.status);
  end if;

  return new;
end;
$$;

create trigger trg_application_update
  before update on public.applications
  for each row
  execute function public.handle_application_update();

-- 6. Trigger to log initial status on insert
create or replace function public.handle_application_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.status_history (application_id, status)
  values (new.id, new.status);
  return new;
end;
$$;

create trigger trg_application_insert
  after insert on public.applications
  for each row
  execute function public.handle_application_insert();

-- 7. Storage bucket + policies for resume PDFs

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "Users can upload own resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes' and auth.role() = 'authenticated'
  );

create policy "Users can view own resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes' and auth.role() = 'authenticated'
  );

create policy "Users can update own resumes"
  on storage.objects for update
  using (
    bucket_id = 'resumes' and auth.role() = 'authenticated'
  );

create policy "Users can delete own resumes"
  on storage.objects for delete
  using (
    bucket_id = 'resumes' and auth.role() = 'authenticated'
  );
