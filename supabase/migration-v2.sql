-- CareerTrack v2 schema migration
-- Run this AFTER the base schema.sql in the Supabase SQL editor

-- 1. Cover letter versions table
create table if not exists public.cover_letter_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  content text,
  file_url text,
  file_size_kb int,
  created_at timestamptz not null default now()
);

-- 2. Interview rounds table
create table if not exists public.interview_rounds (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  round_label text not null,
  scheduled_date date,
  questions_asked text,
  notes text,
  prep_notes text,
  rating int check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tags table
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

-- 4. Application-tags junction table
create table if not exists public.application_tags (
  application_id uuid not null references public.applications(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (application_id, tag_id)
);

-- 5. Add new columns to applications
alter table public.applications
  add column if not exists salary_min int,
  add column if not exists salary_max int,
  add column if not exists equity text,
  add column if not exists benefits text,
  add column if not exists cover_letter_version_id uuid references public.cover_letter_versions(id) on delete set null;

-- 6. Enable RLS on new tables
alter table public.cover_letter_versions enable row level security;
alter table public.interview_rounds enable row level security;
alter table public.tags enable row level security;
alter table public.application_tags enable row level security;

-- 7. RLS policies for cover_letter_versions
create policy "Users can view own cover letter versions"
  on public.cover_letter_versions for select
  using (auth.uid() = user_id);

create policy "Users can insert own cover letter versions"
  on public.cover_letter_versions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cover letter versions"
  on public.cover_letter_versions for update
  using (auth.uid() = user_id);

create policy "Users can delete own cover letter versions"
  on public.cover_letter_versions for delete
  using (auth.uid() = user_id);

-- 8. RLS policies for interview_rounds (via application ownership)
create policy "Users can view own interview rounds"
  on public.interview_rounds for select
  using (
    exists (
      select 1 from public.applications
      where applications.id = interview_rounds.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users can insert own interview rounds"
  on public.interview_rounds for insert
  with check (
    exists (
      select 1 from public.applications
      where applications.id = interview_rounds.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users can update own interview rounds"
  on public.interview_rounds for update
  using (
    exists (
      select 1 from public.applications
      where applications.id = interview_rounds.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users can delete own interview rounds"
  on public.interview_rounds for delete
  using (
    exists (
      select 1 from public.applications
      where applications.id = interview_rounds.application_id
      and applications.user_id = auth.uid()
    )
  );

-- 9. RLS policies for tags
create policy "Users can view own tags"
  on public.tags for select
  using (auth.uid() = user_id);

create policy "Users can insert own tags"
  on public.tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on public.tags for update
  using (auth.uid() = user_id);

create policy "Users can delete own tags"
  on public.tags for delete
  using (auth.uid() = user_id);

-- 10. RLS policies for application_tags (via application ownership)
create policy "Users can view own application tags"
  on public.application_tags for select
  using (
    exists (
      select 1 from public.applications
      where applications.id = application_tags.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users can insert own application tags"
  on public.application_tags for insert
  with check (
    exists (
      select 1 from public.applications
      where applications.id = application_tags.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users can delete own application tags"
  on public.application_tags for delete
  using (
    exists (
      select 1 from public.applications
      where applications.id = application_tags.application_id
      and applications.user_id = auth.uid()
    )
  );

-- 11. Storage bucket for cover letter PDFs
insert into storage.buckets (id, name, public)
values ('cover-letters', 'cover-letters', false)
on conflict (id) do nothing;

create policy "Users can upload own cover letters"
  on storage.objects for insert
  with check (
    bucket_id = 'cover-letters' and auth.role() = 'authenticated'
  );

create policy "Users can view own cover letters"
  on storage.objects for select
  using (
    bucket_id = 'cover-letters' and auth.role() = 'authenticated'
  );

create policy "Users can update own cover letters"
  on storage.objects for update
  using (
    bucket_id = 'cover-letters' and auth.role() = 'authenticated'
  );

create policy "Users can delete own cover letters"
  on storage.objects for delete
  using (
    bucket_id = 'cover-letters' and auth.role() = 'authenticated'
  );

-- 12. Function + trigger for interview_rounds updated_at
create or replace function public.handle_interview_round_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_interview_round_update
  before update on public.interview_rounds
  for each row
  execute function public.handle_interview_round_update();
