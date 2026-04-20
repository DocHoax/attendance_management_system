create or replace function public.sync_authenticated_user_profile()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  metadata jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  user_role_value public.user_role;
  user_email text := auth.jwt() ->> 'email';
  generated_student_number text;
  generated_staff_number text;
  generated_admin_number text;
begin
  if current_user_id is null then
    return;
  end if;

  generated_student_number := 'MAT/' || upper(substr(replace(current_user_id::text, '-', ''), 1, 8));
  generated_staff_number := 'LEC/' || upper(substr(replace(current_user_id::text, '-', ''), 1, 8));
  generated_admin_number := 'ADM/' || upper(substr(replace(current_user_id::text, '-', ''), 1, 8));

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
    current_user_id,
    coalesce(user_email, metadata ->> 'email'),
    coalesce(metadata ->> 'full_name', user_email, 'User'),
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
      current_user_id,
      coalesce(metadata ->> 'matric_number', generated_student_number),
      coalesce((metadata ->> 'level')::integer, 100),
      coalesce((metadata ->> 'attendance_rate')::numeric, 0)
    )
    on conflict (user_id) do update
      set matric_number = excluded.matric_number,
          level = excluded.level,
          attendance_rate = excluded.attendance_rate;
  elsif user_role_value = 'lecturer' then
    insert into public.lecturer_profiles (user_id, staff_id, position)
    values (
      current_user_id,
      coalesce(metadata ->> 'staff_id', generated_staff_number),
      coalesce(nullif(metadata ->> 'position', ''), 'Lecturer')
    )
    on conflict (user_id) do update
      set staff_id = excluded.staff_id,
          position = excluded.position;
  else
    insert into public.admin_profiles (user_id, staff_id, position)
    values (
      current_user_id,
      coalesce(metadata ->> 'staff_id', generated_admin_number),
      coalesce(nullif(metadata ->> 'position', ''), 'Administrator')
    )
    on conflict (user_id) do update
      set staff_id = excluded.staff_id,
          position = excluded.position;
  end if;

  insert into public.user_settings (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;
end;
$$;

grant execute on function public.sync_authenticated_user_profile() to authenticated;
