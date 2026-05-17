-- Migration: create student_progress table
-- Run this in Supabase SQL editor or via psql against your database.

create table if not exists public.student_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid null references public.courses(id) on delete set null,
  key text not null,
  progress_value numeric not null default 0,
  meta jsonb null,
  updated_at timestamptz not null default now()
);

alter table public.student_progress
  alter column id set default gen_random_uuid();

-- Ensure a user has at most one progress row per (user_id, course_id, key).
-- `nulls not distinct` makes the "All / General" course_id=null rows upsert
-- correctly instead of creating duplicate null-course records.
drop index if exists idx_student_progress_user_course_key;
create unique index idx_student_progress_user_course_key
  on public.student_progress(user_id, course_id, key) nulls not distinct;

alter table public.student_progress enable row level security;

drop policy if exists "student_progress_select_own_or_admin" on public.student_progress;
drop policy if exists "student_progress_insert_own" on public.student_progress;
drop policy if exists "student_progress_update_own" on public.student_progress;
drop policy if exists "student_progress_delete_own" on public.student_progress;

create policy "student_progress_select_own_or_admin" on public.student_progress
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "student_progress_insert_own" on public.student_progress
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "student_progress_update_own" on public.student_progress
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "student_progress_delete_own" on public.student_progress
  for delete to authenticated
  using (auth.uid() = user_id);

-- Let subscribed clients receive user progress changes in real time.
alter table public.student_progress replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.student_progress;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
