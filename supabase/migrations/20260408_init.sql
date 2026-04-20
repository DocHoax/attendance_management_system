create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('student', 'lecturer', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.attendance_status as enum ('present', 'absent', 'late');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_mode as enum ('qr', 'bluetooth-qr');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null,
  department text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  matric_number text not null unique,
  level integer not null,
  attendance_rate numeric(5,2) not null default 0
);

create table if not exists public.lecturer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  staff_id text not null unique,
  position text
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  staff_id text not null unique,
  position text not null
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  lecturer_name text not null,
  department text not null,
  level integer not null,
  total_students integer not null default 0,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_schedules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  day_of_week text not null,
  start_time time not null,
  end_time time not null,
  room text not null,
  unique(course_id)
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique(course_id, student_id)
);

create table if not exists public.attendance_sessions (
  id uuid primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  course_code text not null,
  course_title text not null,
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  lecturer_name text not null,
  barcode_data text not null unique,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  duration_minutes integer not null default 15,
  scanned_student_ids uuid[] not null default '{}'::uuid[],
  total_students integer not null,
  room text not null,
  is_active boolean not null default true,
  requires_bluetooth boolean not null default false,
  bluetooth_device_name text,
  bluetooth_service_uuid text
);

create table if not exists public.attendance_records (
  id uuid primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  course_code text not null,
  course_title text not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  student_name text not null,
  student_matric text not null,
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  time text not null,
  status public.attendance_status not null,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  verification_mode public.verification_mode not null default 'qr',
  bluetooth_device_name text,
  bluetooth_device_id text,
  created_at timestamptz not null default now(),
  unique(session_id, student_id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_alerts boolean not null default true,
  session_reminders boolean not null default true,
  weekly_summary boolean not null default false,
  camera_guidance boolean not null default true,
  accent_theme text not null default 'blue',
  bluetooth_required_default boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bluetooth_verifications (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  device_name text,
  device_id text,
  success boolean not null,
  reason text,
  verified_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_courses_lecturer_id on public.courses(lecturer_id);
create index if not exists idx_course_enrollments_student_id on public.course_enrollments(student_id);
create index if not exists idx_course_enrollments_course_id on public.course_enrollments(course_id);
create index if not exists idx_sessions_course_id on public.attendance_sessions(course_id);
create index if not exists idx_sessions_lecturer_id on public.attendance_sessions(lecturer_id);
create index if not exists idx_sessions_active on public.attendance_sessions(is_active);
create index if not exists idx_records_student_id on public.attendance_records(student_id);
create index if not exists idx_records_course_id on public.attendance_records(course_id);
create index if not exists idx_records_session_id on public.attendance_records(session_id);

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.lecturer_profiles enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_schedules enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.user_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.bluetooth_verifications enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "student_profiles_select_own" on public.student_profiles;
drop policy if exists "lecturer_profiles_select_own" on public.lecturer_profiles;
drop policy if exists "admin_profiles_select_own" on public.admin_profiles;
drop policy if exists "courses_select_authenticated" on public.courses;
drop policy if exists "courses_manage_own_lecturer" on public.courses;
drop policy if exists "course_schedules_select_authenticated" on public.course_schedules;
drop policy if exists "course_schedules_manage_own" on public.course_schedules;
drop policy if exists "course_enrollments_select_authenticated" on public.course_enrollments;
drop policy if exists "course_enrollments_insert_admin_or_lecturer" on public.course_enrollments;
drop policy if exists "attendance_sessions_select_authenticated" on public.attendance_sessions;
drop policy if exists "attendance_sessions_manage_own" on public.attendance_sessions;
drop policy if exists "attendance_sessions_update_own" on public.attendance_sessions;
drop policy if exists "attendance_records_select_own_or_admin" on public.attendance_records;
drop policy if exists "attendance_records_insert_own" on public.attendance_records;
drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;
drop policy if exists "audit_logs_admin_only" on public.audit_logs;
drop policy if exists "bluetooth_verifications_select_own_or_admin" on public.bluetooth_verifications;
drop policy if exists "bluetooth_verifications_insert_own" on public.bluetooth_verifications;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "student_profiles_select_own" on public.student_profiles
  for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "lecturer_profiles_select_own" on public.lecturer_profiles
  for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "admin_profiles_select_own" on public.admin_profiles
  for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "courses_select_authenticated" on public.courses
  for select to authenticated
  using (true);

create policy "courses_manage_own_lecturer" on public.courses
  for insert to authenticated
  with check (auth.uid() = lecturer_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "course_schedules_select_authenticated" on public.course_schedules
  for select to authenticated
  using (true);

create policy "course_schedules_manage_own" on public.course_schedules
  for insert to authenticated
  with check (exists (
    select 1 from public.courses c
    where c.id = course_id and (c.lecturer_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));

create policy "course_enrollments_select_authenticated" on public.course_enrollments
  for select to authenticated
  using (auth.uid() = student_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('lecturer', 'admin')));

create policy "course_enrollments_insert_admin_or_lecturer" on public.course_enrollments
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('lecturer', 'admin')));

create policy "attendance_sessions_select_authenticated" on public.attendance_sessions
  for select to authenticated
  using (true);

create policy "attendance_sessions_manage_own" on public.attendance_sessions
  for insert to authenticated
  with check (auth.uid() = lecturer_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "attendance_sessions_update_own" on public.attendance_sessions
  for update to authenticated
  using (auth.uid() = lecturer_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (auth.uid() = lecturer_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "attendance_records_select_own_or_admin" on public.attendance_records
  for select to authenticated
  using (
    auth.uid() = student_id
    or exists (select 1 from public.courses c where c.id = course_id and c.lecturer_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "attendance_records_insert_own" on public.attendance_records
  for insert to authenticated
  with check (
    auth.uid() = student_id
    and exists (select 1 from public.course_enrollments e where e.course_id = course_id and e.student_id = auth.uid())
    and exists (select 1 from public.attendance_sessions s where s.id = session_id and s.is_active = true)
  );

create policy "user_settings_select_own" on public.user_settings
  for select to authenticated
  using (auth.uid() = user_id);

create policy "user_settings_update_own" on public.user_settings
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "audit_logs_admin_only" on public.audit_logs
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "bluetooth_verifications_select_own_or_admin" on public.bluetooth_verifications
  for select to authenticated
  using (auth.uid() = student_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') or exists (select 1 from public.courses c where c.id = (select s.course_id from public.attendance_sessions s where s.id = session_id) and c.lecturer_id = auth.uid()));

create policy "bluetooth_verifications_insert_own" on public.bluetooth_verifications
  for insert to authenticated
  with check (auth.uid() = student_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role_value public.user_role;
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  generated_student_number text := 'MAT/' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  generated_staff_number text := 'LEC/' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  generated_admin_number text := 'ADM/' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
begin
  user_role_value := case lower(coalesce(metadata ->> 'role', ''))
    when 'student' then 'student'::public.user_role
    when 'lecturer' then 'lecturer'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else case
      when metadata ? 'matric_number' then 'student'::public.user_role
      when metadata ? 'staff_id' then 'lecturer'::public.user_role
      when lower(coalesce(metadata ->> 'position', '')) like '%admin%' then 'admin'::public.user_role
      when metadata ? 'position' then 'lecturer'::public.user_role
      else 'student'::public.user_role
    end
  end;

  insert into public.profiles (id, email, full_name, role, department, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(metadata ->> 'full_name', new.email),
    user_role_value,
    coalesce(metadata ->> 'department', 'General Studies'),
    nullif(metadata ->> 'avatar_url', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        department = excluded.department,
        avatar_url = excluded.avatar_url,
        updated_at = now();

  if user_role_value = 'student' then
    insert into public.student_profiles (user_id, matric_number, level, attendance_rate)
    values (
      new.id,
      coalesce(metadata ->> 'matric_number', generated_student_number),
      coalesce((metadata ->> 'level')::integer, 100),
      coalesce((metadata ->> 'attendance_rate')::numeric, 0)
    )
    on conflict (user_id) do nothing;
  elsif user_role_value = 'lecturer' then
    insert into public.lecturer_profiles (user_id, staff_id, position)
    values (
      new.id,
      coalesce(metadata ->> 'staff_id', generated_staff_number),
      coalesce(nullif(metadata ->> 'position', ''), 'Lecturer')
    )
    on conflict (user_id) do nothing;
  else
    insert into public.admin_profiles (user_id, staff_id, position)
    values (
      new.id,
      coalesce(metadata ->> 'staff_id', generated_admin_number),
      coalesce(nullif(metadata ->> 'position', ''), 'Administrator')
    )
    on conflict (user_id) do nothing;
  end if;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.student_profiles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.lecturer_profiles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.admin_profiles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.courses;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.course_schedules;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.course_enrollments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.attendance_sessions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.attendance_records;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.user_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.bluetooth_verifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;