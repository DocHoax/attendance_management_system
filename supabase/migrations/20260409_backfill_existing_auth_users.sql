do $$
declare
  auth_user record;
  user_role_value public.user_role;
  metadata jsonb;
  generated_student_number text;
  generated_staff_number text;
  generated_admin_number text;
begin
  for auth_user in select id, email, raw_user_meta_data from auth.users loop
    metadata := coalesce(auth_user.raw_user_meta_data, '{}'::jsonb);
    generated_student_number := 'MAT/' || upper(substr(replace(auth_user.id::text, '-', ''), 1, 8));
    generated_staff_number := 'LEC/' || upper(substr(replace(auth_user.id::text, '-', ''), 1, 8));
    generated_admin_number := 'ADM/' || upper(substr(replace(auth_user.id::text, '-', ''), 1, 8));

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
      auth_user.id,
      auth_user.email,
      coalesce(metadata ->> 'full_name', auth_user.email),
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
        auth_user.id,
        coalesce(metadata ->> 'matric_number', generated_student_number),
        coalesce((metadata ->> 'level')::integer, 100),
        coalesce((metadata ->> 'attendance_rate')::numeric, 0)
      )
      on conflict (user_id) do nothing;
    elsif user_role_value = 'lecturer' then
      insert into public.lecturer_profiles (user_id, staff_id, position)
      values (
        auth_user.id,
        coalesce(metadata ->> 'staff_id', generated_staff_number),
        coalesce(nullif(metadata ->> 'position', ''), 'Lecturer')
      )
      on conflict (user_id) do nothing;
    else
      insert into public.admin_profiles (user_id, staff_id, position)
      values (
        auth_user.id,
        coalesce(metadata ->> 'staff_id', generated_admin_number),
        coalesce(nullif(metadata ->> 'position', ''), 'Administrator')
      )
      on conflict (user_id) do nothing;
    end if;

    insert into public.user_settings (user_id)
    values (auth_user.id)
    on conflict (user_id) do nothing;
  end loop;
end;
$$;