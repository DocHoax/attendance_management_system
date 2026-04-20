# Supabase Setup

This app is ready to run against Supabase with the existing migration and client wrapper.

## What to set up

1. Create a Supabase project.
2. Open the project settings and copy the project URL and anon key.
3. Put those values into `.env.local` at the repo root:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Open the SQL editor and run [migrations/20260408_init.sql](migrations/20260408_init.sql).
5. Run [migrations/20260409_backfill_existing_auth_users.sql](migrations/20260409_backfill_existing_auth_users.sql) if you already have auth users in the project.
6. Run [migrations/20260411_sync_authenticated_user_profile.sql](migrations/20260411_sync_authenticated_user_profile.sql) so new sign-ins can self-heal missing profile rows.
7. Create auth users for the demo roles, then make sure their user metadata includes:
   - `role`
   - `full_name`
   - `department`
   - `staff_id` or `matric_number` depending on the role
   The trigger now infers the role from that metadata and falls back to unique generated IDs if you omit `staff_id` or `matric_number`.
8. If you add or change tables later, keep the realtime publication updated so dashboard subscriptions continue to work.

## Tables in use

- `profiles`
- `student_profiles`
- `lecturer_profiles`
- `admin_profiles`
- `courses`
- `course_schedules`
- `course_enrollments`
- `attendance_sessions`
- `attendance_records`
- `user_settings`
- `bluetooth_verifications`

## Realtime behavior

- Attendance sessions and attendance records are subscribed to directly.
- Student, lecturer, and admin dashboard summaries refresh when related tables change.
- The migration adds the main app tables to `supabase_realtime` so these subscriptions work without extra manual steps.

## Optional local workflow

- If you use the Supabase CLI, run the migration through your local database and then push it to the hosted project.
- Keep the SQL migration as the source of truth so the app and schema stay aligned.