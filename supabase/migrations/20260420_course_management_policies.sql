do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'courses_update_own_or_admin'
  ) then
    create policy "courses_update_own_or_admin" on public.courses
      for update to authenticated
      using (
        auth.uid() = lecturer_id
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        auth.uid() = lecturer_id
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'courses_delete_own_or_admin'
  ) then
    create policy "courses_delete_own_or_admin" on public.courses
      for delete to authenticated
      using (
        auth.uid() = lecturer_id
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_schedules'
      and policyname = 'course_schedules_update_own_or_admin'
  ) then
    create policy "course_schedules_update_own_or_admin" on public.course_schedules
      for update to authenticated
      using (
        exists (
          select 1
          from public.courses c
          where c.id = course_id
            and (
              c.lecturer_id = auth.uid()
              or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
            )
        )
      )
      with check (
        exists (
          select 1
          from public.courses c
          where c.id = course_id
            and (
              c.lecturer_id = auth.uid()
              or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
            )
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_schedules'
      and policyname = 'course_schedules_delete_own_or_admin'
  ) then
    create policy "course_schedules_delete_own_or_admin" on public.course_schedules
      for delete to authenticated
      using (
        exists (
          select 1
          from public.courses c
          where c.id = course_id
            and (
              c.lecturer_id = auth.uid()
              or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
            )
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_enrollments'
      and policyname = 'course_enrollments_delete_admin_or_lecturer'
  ) then
    create policy "course_enrollments_delete_admin_or_lecturer" on public.course_enrollments
      for delete to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('lecturer', 'admin'))
      );
  end if;
end $$;