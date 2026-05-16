-- Migration: create student_progress table
-- Run this in Supabase SQL editor or via psql against your database.

create table if not exists public.student_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid null references public.courses(id) on delete set null,
  key text not null,
  progress_value numeric not null default 0,
  meta jsonb null,
  updated_at timestamptz not null default now()
);

-- ensure a user has at most one progress row per (user_id, course_id, key)
create unique index if not exists idx_student_progress_user_course_key on public.student_progress(user_id, course_id, key);

-- optional: grant select/insert/update on the table to anon or authenticated role
-- grant select, insert, update on public.student_progress to authenticated;
