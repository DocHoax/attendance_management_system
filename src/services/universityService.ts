import type { ActiveSession, AttendanceRecord, Course, Admin, Lecturer, Student, User, UserRole } from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

type AuthenticatedUser = Student | Lecturer | Admin;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  avatar_url: string | null;
};

type StudentProfileRow = {
  user_id: string;
  matric_number: string;
  level: number;
  attendance_rate: number | null;
};

type LecturerProfileRow = {
  user_id: string;
  staff_id: string;
  position: string | null;
};

type AdminProfileRow = {
  user_id: string;
  staff_id: string;
  position: string;
};

type CourseRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  lecturer_id: string;
  lecturer_name: string;
  department: string;
  level: number;
  total_students: number;
  color: string | null;
};

type CourseScheduleRow = {
  course_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
};

type CourseEnrollmentRow = {
  course_id: string;
  student_id: string;
};

export type CourseCreationInput = {
  code: string;
  title: string;
  description: string;
  lecturerId: string;
  lecturerName: string;
  department: string;
  level: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  color: string;
};

export type CourseUpdateInput = CourseCreationInput & {
  courseId: string;
};

type CourseImportRow = {
  code: string;
  title: string;
  description: string;
  lecturerIdentifier: string;
  department: string;
  level: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  color: string;
};

export type ManagementResult = {
  success: boolean;
  message: string;
};

export type BluetoothVerificationAttempt = {
  sessionId: string;
  studentId: string;
  success: boolean;
  deviceName?: string;
  deviceId?: string;
  reason?: string;
};

export type BluetoothVerificationLog = {
  id: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  studentMatric?: string;
  studentDepartment?: string;
  sessionCourseCode?: string;
  sessionCourseTitle?: string;
  sessionLecturerName?: string;
  sessionRoom?: string;
  sessionIsActive?: boolean;
  sessionRequiresBluetooth?: boolean;
  sessionCreatedAt?: string;
  sessionExpiresAt?: string;
  deviceName?: string;
  deviceId?: string;
  success: boolean;
  reason?: string;
  verifiedAt: string;
};

type AttendanceSessionRow = {
  id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  lecturer_id: string;
  lecturer_name: string;
  barcode_data: string;
  created_at: string;
  expires_at: string;
  duration_minutes: number;
  scanned_student_ids: string[];
  total_students: number;
  room: string;
  is_active: boolean;
  requires_bluetooth: boolean;
  bluetooth_device_name: string | null;
  bluetooth_service_uuid: string | null;
};

type AttendanceRecordRow = {
  id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  student_id: string;
  student_name: string;
  student_matric: string;
  lecturer_id: string;
  date: string;
  time: string;
  status: 'present' | 'absent' | 'late';
  session_id: string;
  verification_mode: 'qr' | 'bluetooth-qr';
  bluetooth_device_name: string | null;
  bluetooth_device_id: string | null;
  created_at: string;
};

type BluetoothVerificationRow = {
  id: string;
  session_id: string;
  student_id: string;
  device_name: string | null;
  device_id: string | null;
  success: boolean;
  reason: string | null;
  verified_at: string;
};

type BluetoothVerificationProfileRow = {
  id: string;
  email: string;
  full_name: string;
  department: string;
};

type BluetoothVerificationStudentRow = {
  user_id: string;
  matric_number: string;
};

type BluetoothVerificationSessionRow = {
  id: string;
  course_code: string;
  course_title: string;
  lecturer_name: string;
  room: string;
  is_active: boolean;
  requires_bluetooth: boolean;
  created_at: string;
  expires_at: string;
};

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type AuthErrorCode = 'invalid-credentials' | 'role-mismatch' | 'profile-missing';

export type AuthResult = {
  user: User | null;
  errorCode: AuthErrorCode | null;
  message: string | null;
};

function mapProfileRow(row: ProfileRow, roleDetails?: StudentProfileRow | LecturerProfileRow | AdminProfileRow): AuthenticatedUser {
  if (row.role === 'student') {
    const studentDetails = roleDetails as StudentProfileRow | undefined;

    return {
      id: row.id,
      email: row.email,
      name: row.full_name,
      role: 'student',
      department: row.department,
      avatar: row.avatar_url ?? undefined,
      matricNumber: studentDetails?.matric_number ?? '',
      level: studentDetails?.level ?? 0,
      enrolledCourses: [],
      attendanceRate: studentDetails?.attendance_rate ?? 0,
    };
  }

  if (row.role === 'lecturer') {
    const lecturerDetails = roleDetails as LecturerProfileRow | undefined;

    return {
      id: row.id,
      email: row.email,
      name: row.full_name,
      role: 'lecturer',
      department: row.department,
      avatar: row.avatar_url ?? undefined,
      staffId: lecturerDetails?.staff_id ?? '',
      assignedCourses: [],
    };
  }

  const adminDetails = roleDetails as AdminProfileRow | undefined;

  return {
    id: row.id,
    email: row.email,
    name: row.full_name,
    role: 'admin',
    department: row.department,
    avatar: row.avatar_url ?? undefined,
    staffId: adminDetails?.staff_id ?? '',
    position: adminDetails?.position ?? '',
  };
}

function mapCourseRow(row: CourseRow, schedule?: CourseScheduleRow): Course {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    lecturerId: row.lecturer_id,
    lecturerName: row.lecturer_name,
    department: row.department,
    level: row.level,
    schedule: {
      day: schedule?.day_of_week ?? 'Monday',
      startTime: schedule?.start_time ?? '09:00',
      endTime: schedule?.end_time ?? '10:00',
      room: schedule?.room ?? 'Lecture Hall',
    },
    totalStudents: row.total_students,
    color: row.color ?? '#3b82f6',
  };
}

function mapSessionRow(row: AttendanceSessionRow): ActiveSession {
  return {
    id: row.id,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    lecturerId: row.lecturer_id,
    lecturerName: row.lecturer_name,
    barcodeData: row.barcode_data,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    duration: row.duration_minutes,
    scannedStudents: row.scanned_student_ids ?? [],
    totalStudents: row.total_students,
    room: row.room,
    isActive: row.is_active,
    requiresBluetooth: row.requires_bluetooth,
    bluetoothDeviceName: row.bluetooth_device_name ?? undefined,
    bluetoothServiceUuid: row.bluetooth_service_uuid ?? undefined,
  };
}

function mapRecordRow(row: AttendanceRecordRow): AttendanceRecord {
  return {
    id: row.id,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    studentId: row.student_id,
    studentName: row.student_name,
    studentMatric: row.student_matric,
    lecturerId: row.lecturer_id,
    date: row.date,
    time: row.time,
    status: row.status,
    sessionId: row.session_id,
    verificationMode: row.verification_mode,
    bluetoothDeviceName: row.bluetooth_device_name ?? undefined,
    bluetoothDeviceId: row.bluetooth_device_id ?? undefined,
  };
}

function buildCourseMap(courses: CourseRow[], schedules: CourseScheduleRow[], enrollmentCounts: Map<string, number>): Course[] {
  return courses.map((course) => {
    const schedule = schedules.find((item) => item.course_id === course.id);

    return {
      ...mapCourseRow(course, schedule),
      totalStudents: enrollmentCounts.get(course.id) ?? course.total_students,
    };
  });
}

function asMetadataRecord(metadata: SupabaseAuthUser['user_metadata']): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
}

function readMetadataString(metadata: Record<string, unknown>, key: string): string {
  const value = metadata[key];

  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function readMetadataNumber(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function inferRoleFromMetadata(metadata: Record<string, unknown>, preferredRole?: UserRole): UserRole {
  const explicitRole = readMetadataString(metadata, 'role').toLowerCase();

  if (explicitRole === 'student' || explicitRole === 'lecturer' || explicitRole === 'admin') {
    return explicitRole;
  }

  if (preferredRole) {
    return preferredRole;
  }

  if (readMetadataString(metadata, 'matric_number')) {
    return 'student';
  }

  if (readMetadataString(metadata, 'staff_id')) {
    return 'lecturer';
  }

  if (readMetadataString(metadata, 'position').toLowerCase().includes('admin')) {
    return 'admin';
  }

  if (readMetadataString(metadata, 'position')) {
    return 'lecturer';
  }

  return preferredRole ?? 'student';
}

function buildFallbackUser(authUser: SupabaseAuthUser, preferredRole?: UserRole): AuthenticatedUser {
  const metadata = asMetadataRecord(authUser.user_metadata);
  const role = inferRoleFromMetadata(metadata, preferredRole);
  const generatedSuffix = authUser.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const displayName = readMetadataString(metadata, 'full_name') || authUser.email || 'Unknown User';
  const department = readMetadataString(metadata, 'department') || 'General Studies';
  const avatar = readMetadataString(metadata, 'avatar_url') || undefined;

  if (role === 'student') {
    return {
      id: authUser.id,
      email: authUser.email ?? '',
      name: displayName,
      role: 'student',
      department,
      avatar,
      matricNumber: readMetadataString(metadata, 'matric_number') || `MAT/${generatedSuffix}`,
      level: readMetadataNumber(metadata, 'level') ?? 100,
      enrolledCourses: [],
      attendanceRate: readMetadataNumber(metadata, 'attendance_rate') ?? 0,
    };
  }

  if (role === 'lecturer') {
    return {
      id: authUser.id,
      email: authUser.email ?? '',
      name: displayName,
      role: 'lecturer',
      department,
      avatar,
      staffId: readMetadataString(metadata, 'staff_id') || `LEC/${generatedSuffix}`,
      assignedCourses: [],
    };
  }

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name: displayName,
    role: 'admin',
    department,
    avatar,
    staffId: readMetadataString(metadata, 'staff_id') || `ADM/${generatedSuffix}`,
    position: readMetadataString(metadata, 'position') || 'Administrator',
  };
}

async function syncAuthenticatedProfile(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase.rpc('sync_authenticated_user_profile');

  if (error) {
    return;
  }
}

async function loadSupabaseUser(authUser: SupabaseAuthUser): Promise<AuthenticatedUser | null> {
  if (!supabase) return null;

  const { data: profileById, error: profileByIdError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  let profile = profileById;

  if (profileByIdError || !profile) {
    if (!authUser.email) {
      return null;
    }

    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', authUser.email)
      .maybeSingle();

    profile = profileByEmail ?? null;
  }

  if (!profile) return null;

  if (profile.role === 'student') {
    const { data: studentDetails } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    return mapProfileRow(profile as ProfileRow, studentDetails as StudentProfileRow | undefined) as Student;
  }

  if (profile.role === 'lecturer') {
    const { data: lecturerDetails } = await supabase
      .from('lecturer_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    return mapProfileRow(profile as ProfileRow, lecturerDetails as LecturerProfileRow | undefined) as Lecturer;
  }

  const { data: adminDetails } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle();

  return mapProfileRow(profile as ProfileRow, adminDetails as AdminProfileRow | undefined) as Admin;
}

export type RegisterUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  department: string;
  matricNumber?: string;
  level?: number;
  staffId?: string;
  position?: string;
};

export type RegisterResult = {
  user: User | null;
  needsEmailConfirmation: boolean;
  errorCode: 'registration-failed' | 'email-in-use' | null;
  message: string | null;
};

export async function registerUser(input: RegisterUserInput): Promise<RegisterResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      user: null,
      needsEmailConfirmation: false,
      errorCode: 'registration-failed',
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const metadata: Record<string, unknown> = {
    full_name: input.fullName.trim(),
    role: input.role,
    department: input.department.trim(),
  };

  if (input.role === 'student') {
    if (input.matricNumber?.trim()) metadata.matric_number = input.matricNumber.trim();
    if (typeof input.level === 'number' && Number.isFinite(input.level)) metadata.level = input.level;
  } else if (input.role === 'lecturer') {
    if (input.staffId?.trim()) metadata.staff_id = input.staffId.trim();
    if (input.position?.trim()) metadata.position = input.position.trim();
  } else if (input.role === 'admin') {
    if (input.staffId?.trim()) metadata.staff_id = input.staffId.trim();
    if (input.position?.trim()) metadata.position = input.position.trim();
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: metadata,
    },
  });

  if (error) {
    const isEmailInUse = /already registered|already exists|duplicate/i.test(error.message);
    return {
      user: null,
      needsEmailConfirmation: false,
      errorCode: isEmailInUse ? 'email-in-use' : 'registration-failed',
      message: error.message,
    };
  }

  if (!data.user) {
    return {
      user: null,
      needsEmailConfirmation: false,
      errorCode: 'registration-failed',
      message: 'Unable to create account. Please try again.',
    };
  }

  // If a session was returned, the user is already signed in; sync profile rows.
  if (data.session) {
    await syncAuthenticatedProfile();
    const user = (await loadSupabaseUser(data.user)) ?? buildFallbackUser(data.user, input.role);

    return {
      user,
      needsEmailConfirmation: false,
      errorCode: null,
      message: null,
    };
  }

  // No session => email confirmation is required.
  return {
    user: buildFallbackUser(data.user, input.role),
    needsEmailConfirmation: true,
    errorCode: null,
    message: 'Check your email to confirm your account before signing in.',
  };
}

export async function authenticateUser(email: string, password: string, role: UserRole): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      user: null,
      errorCode: 'invalid-credentials',
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return {
      user: null,
      errorCode: 'invalid-credentials',
      message: error?.message ?? 'Invalid email or password.',
    };
  }

  await syncAuthenticatedProfile();

  const user = await loadSupabaseUser(data.user);

  if (!user) {
    return {
      user: buildFallbackUser(data.user, role),
      errorCode: null,
      message: null,
    };
  }

  return { user, errorCode: null, message: null };
}

export async function restoreAuthenticatedUser(): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data } = await supabase.auth.getUser();
  const authUser = data.user;

  if (!authUser) return null;

  await syncAuthenticatedProfile();

  return loadSupabaseUser(authUser) ?? buildFallbackUser(authUser);
}

export async function signOutUser(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  await supabase.auth.signOut();
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const { data } = await supabase.auth.getUser();
  const authUser = data.user;

  if (!authUser?.email) {
    return {
      success: false,
      message: 'No authenticated user was found.',
    };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: currentPassword,
  });

  if (reauthError) {
    return {
      success: false,
      message: 'Current password is incorrect.',
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  return {
    success: true,
    message: 'Password updated successfully.',
  };
}

export async function updateProfileInDatabase(user: User, updates: Partial<Pick<User, 'name' | 'email' | 'department' | 'avatar'>>): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) {
    return { ...user, ...updates } as User;
  }

  const nextEmail = updates.email?.trim() || user.email;

  if (nextEmail !== user.email) {
    const { error: authError } = await supabase.auth.updateUser({
      email: nextEmail,
    });

    if (authError) {
      return null;
    }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: updates.name,
      email: nextEmail,
      department: updates.department,
      avatar_url: updates.avatar,
      role: user.role,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !profile) return null;

  const roleSpecific = user.role === 'student'
    ? await supabase.from('student_profiles').select('*').eq('user_id', user.id).maybeSingle()
    : user.role === 'lecturer'
      ? await supabase.from('lecturer_profiles').select('*').eq('user_id', user.id).maybeSingle()
      : await supabase.from('admin_profiles').select('*').eq('user_id', user.id).maybeSingle();

  return mapProfileRow(profile as ProfileRow, roleSpecific.data as StudentProfileRow | LecturerProfileRow | AdminProfileRow | undefined);
}

export async function getAllCourses(): Promise<Course[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const [coursesResult, schedulesResult, enrollmentsResult] = await Promise.all([
    supabase.from('courses').select('*').order('created_at', { ascending: false }),
    supabase.from('course_schedules').select('*'),
    supabase.from('course_enrollments').select('course_id'),
  ]);

  const enrollmentCounts = new Map<string, number>();

  (enrollmentsResult.data ?? []).forEach((row) => {
    const enrollmentRow = row as CourseEnrollmentRow;
    enrollmentCounts.set(enrollmentRow.course_id, (enrollmentCounts.get(enrollmentRow.course_id) ?? 0) + 1);
  });

  return buildCourseMap(
    (coursesResult.data ?? []) as CourseRow[],
    (schedulesResult.data ?? []) as CourseScheduleRow[],
    enrollmentCounts,
  );
}

export async function getAllStudents(): Promise<Student[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const [{ data: profiles }, { data: details }, { data: enrollments }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'student').order('full_name', { ascending: true }),
    supabase.from('student_profiles').select('*'),
    supabase.from('course_enrollments').select('student_id, course_id'),
  ]);

  const detailsByUser = new Map<string, StudentProfileRow>();
  (details ?? []).forEach((row) => {
    const studentRow = row as StudentProfileRow;
    detailsByUser.set(studentRow.user_id, studentRow);
  });

  const enrolledCoursesByStudent = new Map<string, string[]>();
  (enrollments ?? []).forEach((row) => {
    const enrollmentRow = row as CourseEnrollmentRow;
    const nextCourses = enrolledCoursesByStudent.get(enrollmentRow.student_id) ?? [];
    nextCourses.push(enrollmentRow.course_id);
    enrolledCoursesByStudent.set(enrollmentRow.student_id, nextCourses);
  });

  return (profiles ?? []).map((profile) => {
    const profileRow = profile as ProfileRow;
    const studentDetails = detailsByUser.get(profileRow.id);

    return {
      id: profileRow.id,
      email: profileRow.email,
      name: profileRow.full_name,
      role: 'student',
      department: profileRow.department,
      avatar: profileRow.avatar_url ?? undefined,
      matricNumber: studentDetails?.matric_number ?? '',
      level: studentDetails?.level ?? 0,
      enrolledCourses: enrolledCoursesByStudent.get(profileRow.id) ?? [],
      attendanceRate: studentDetails?.attendance_rate ?? 0,
    };
  });
}

export async function getAllLecturers(): Promise<Lecturer[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const [{ data: profiles }, { data: details }, { data: courses }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'lecturer').order('full_name', { ascending: true }),
    supabase.from('lecturer_profiles').select('*'),
    supabase.from('courses').select('id, lecturer_id'),
  ]);

  const detailsByUser = new Map<string, LecturerProfileRow>();
  (details ?? []).forEach((row) => {
    const lecturerRow = row as LecturerProfileRow;
    detailsByUser.set(lecturerRow.user_id, lecturerRow);
  });

  const coursesByLecturer = new Map<string, string[]>();
  (courses ?? []).forEach((row) => {
    const courseRow = row as { id: string; lecturer_id: string };
    const nextCourses = coursesByLecturer.get(courseRow.lecturer_id) ?? [];
    nextCourses.push(courseRow.id);
    coursesByLecturer.set(courseRow.lecturer_id, nextCourses);
  });

  return (profiles ?? []).map((profile) => {
    const profileRow = profile as ProfileRow;
    const lecturerDetails = detailsByUser.get(profileRow.id);

    return {
      id: profileRow.id,
      email: profileRow.email,
      name: profileRow.full_name,
      role: 'lecturer',
      department: profileRow.department,
      avatar: profileRow.avatar_url ?? undefined,
      staffId: lecturerDetails?.staff_id ?? '',
      assignedCourses: coursesByLecturer.get(profileRow.id) ?? [],
    };
  });
}

export async function createCourse(input: CourseCreationInput): Promise<ManagementResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      code: input.code,
      title: input.title,
      description: input.description,
      lecturer_id: input.lecturerId,
      lecturer_name: input.lecturerName,
      department: input.department,
      level: input.level,
      total_students: 0,
      color: input.color,
    })
    .select('*')
    .single();

  if (courseError || !course) {
    return {
      success: false,
      message: courseError?.message ?? 'Unable to create course.',
    };
  }

  const { error: scheduleError } = await supabase
    .from('course_schedules')
    .insert({
      course_id: (course as CourseRow).id,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      room: input.room,
    });

  if (scheduleError) {
    await supabase.from('courses').delete().eq('id', (course as CourseRow).id);
    return {
      success: false,
      message: scheduleError.message,
    };
  }

  return {
    success: true,
    message: `Course ${input.code} created successfully.`,
  };
}

function parseCourseImportRow(line: string): CourseImportRow | null {
  const parts = line.split('|').map((part) => part.trim());

  if (parts.length < 10) {
    return null;
  }

  const [code, title, description, lecturerIdentifier, department, level, dayOfWeek, startTime, endTime, room, color = '#3b82f6'] = parts;

  if (!code || !title || !description || !lecturerIdentifier || !department || !level || !dayOfWeek || !startTime || !endTime || !room) {
    return null;
  }

  return {
    code,
    title,
    description,
    lecturerIdentifier,
    department,
    level,
    dayOfWeek,
    startTime,
    endTime,
    room,
    color,
  };
}

function resolveLecturerIdentifier(lecturers: Lecturer[], identifier: string): Lecturer | undefined {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  return lecturers.find((lecturer) => {
    return (
      lecturer.id.toLowerCase() === normalizedIdentifier ||
      lecturer.email.toLowerCase() === normalizedIdentifier ||
      lecturer.staffId.toLowerCase() === normalizedIdentifier ||
      lecturer.name.toLowerCase() === normalizedIdentifier
    );
  });
}

export async function bulkCreateCoursesFromText(rawText: string): Promise<ManagementResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const rows = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rows.length === 0) {
    return {
      success: false,
      message: 'Paste at least one course row.',
    };
  }

  const maybeHeader = rows[0].toLowerCase();
  if (maybeHeader.includes('code') && maybeHeader.includes('title') && maybeHeader.includes('lecturer')) {
    rows.shift();
  }

  if (rows.length === 0) {
    return {
      success: false,
      message: 'No import rows were found after the header.',
    };
  }

  const lecturers = await getAllLecturers();
  const results: string[] = [];
  let createdCount = 0;
  let failedCount = 0;

  for (const [index, line] of rows.entries()) {
    const row = parseCourseImportRow(line);

    if (!row) {
      failedCount += 1;
      results.push(`Row ${index + 1}: invalid format.`);
      continue;
    }

    const lecturer = resolveLecturerIdentifier(lecturers, row.lecturerIdentifier);

    if (!lecturer) {
      failedCount += 1;
      results.push(`Row ${index + 1}: lecturer "${row.lecturerIdentifier}" not found.`);
      continue;
    }

    const result = await createCourse({
      code: row.code,
      title: row.title,
      description: row.description,
      lecturerId: lecturer.id,
      lecturerName: lecturer.name,
      department: row.department,
      level: Number.parseInt(row.level, 10) || 100,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      room: row.room,
      color: row.color || '#3b82f6',
    });

    if (!result.success) {
      failedCount += 1;
      results.push(`Row ${index + 1}: ${result.message}`);
      continue;
    }

    createdCount += 1;
  }

  if (createdCount === 0) {
    return {
      success: false,
      message: results.slice(0, 3).join(' '),
    };
  }

  const summary = [`${createdCount} course${createdCount === 1 ? '' : 's'} imported`];

  if (failedCount > 0) {
    summary.push(`${failedCount} row${failedCount === 1 ? '' : 's'} skipped`);
  }

  return {
    success: true,
    message: summary.join('. '),
  };
}

export async function updateCourse(input: CourseUpdateInput): Promise<ManagementResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const { error: courseError } = await supabase
    .from('courses')
    .update({
      code: input.code,
      title: input.title,
      description: input.description,
      lecturer_id: input.lecturerId,
      lecturer_name: input.lecturerName,
      department: input.department,
      level: input.level,
      color: input.color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.courseId);

  if (courseError) {
    return {
      success: false,
      message: courseError.message,
    };
  }

  const { data: existingSchedule } = await supabase
    .from('course_schedules')
    .select('id')
    .eq('course_id', input.courseId)
    .maybeSingle();

  if (existingSchedule) {
    const { error: scheduleError } = await supabase
      .from('course_schedules')
      .update({
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        end_time: input.endTime,
        room: input.room,
      })
      .eq('course_id', input.courseId);

    if (scheduleError) {
      return {
        success: false,
        message: scheduleError.message,
      };
    }
  } else {
    const { error: scheduleError } = await supabase
      .from('course_schedules')
      .insert({
        course_id: input.courseId,
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        end_time: input.endTime,
        room: input.room,
      });

    if (scheduleError) {
      return {
        success: false,
        message: scheduleError.message,
      };
    }
  }

  return {
    success: true,
    message: `Course ${input.code} updated successfully.`,
  };
}

export async function deleteCourse(courseId: string): Promise<ManagementResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: 'Course deleted successfully.',
  };
}

export async function recordBluetoothVerificationAttempt(attempt: BluetoothVerificationAttempt): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  await supabase.from('bluetooth_verifications').insert({
    session_id: attempt.sessionId,
    student_id: attempt.studentId,
    device_name: attempt.deviceName ?? null,
    device_id: attempt.deviceId ?? null,
    success: attempt.success,
    reason: attempt.reason ?? null,
  });
}

export async function getBluetoothVerificationLogs(limit = 10): Promise<BluetoothVerificationLog[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data } = await supabase
    .from('bluetooth_verifications')
    .select('*')
    .order('verified_at', { ascending: false })
    .limit(limit);

  const logRows = (data ?? []).map((row) => row as BluetoothVerificationRow);
  const studentIds = Array.from(new Set(logRows.map((row) => row.student_id)));
  const sessionIds = Array.from(new Set(logRows.map((row) => row.session_id)));

  const [profileResult, studentProfileResult, sessionResult] = await Promise.all([
    studentIds.length > 0
      ? supabase.from('profiles').select('id,email,full_name,department').in('id', studentIds)
      : Promise.resolve({ data: [] as BluetoothVerificationProfileRow[] }),
    studentIds.length > 0
      ? supabase.from('student_profiles').select('user_id,matric_number').in('user_id', studentIds)
      : Promise.resolve({ data: [] as BluetoothVerificationStudentRow[] }),
    sessionIds.length > 0
      ? supabase.from('attendance_sessions').select('id,course_code,course_title,lecturer_name,room,is_active,requires_bluetooth,created_at,expires_at').in('id', sessionIds)
      : Promise.resolve({ data: [] as BluetoothVerificationSessionRow[] }),
  ]);

  const profileMap = new Map((profileResult.data ?? []).map((row) => {
    const profileRow = row as BluetoothVerificationProfileRow;
    return [profileRow.id, profileRow];
  }));
  const studentProfileMap = new Map((studentProfileResult.data ?? []).map((row) => {
    const studentRow = row as BluetoothVerificationStudentRow;
    return [studentRow.user_id, studentRow];
  }));
  const sessionMap = new Map((sessionResult.data ?? []).map((row) => {
    const sessionRow = row as BluetoothVerificationSessionRow;
    return [sessionRow.id, sessionRow];
  }));

  return logRows.map((logRow) => {
    const profileRow = profileMap.get(logRow.student_id);
    const studentRow = studentProfileMap.get(logRow.student_id);
    const sessionRow = sessionMap.get(logRow.session_id);

    return {
      id: logRow.id,
      sessionId: logRow.session_id,
      studentId: logRow.student_id,
      studentName: profileRow?.full_name,
      studentEmail: profileRow?.email,
      studentDepartment: profileRow?.department,
      studentMatric: studentRow?.matric_number,
      sessionCourseCode: sessionRow?.course_code,
      sessionCourseTitle: sessionRow?.course_title,
      sessionLecturerName: sessionRow?.lecturer_name,
      sessionRoom: sessionRow?.room,
      sessionIsActive: sessionRow?.is_active,
      sessionRequiresBluetooth: sessionRow?.requires_bluetooth,
      sessionCreatedAt: sessionRow?.created_at,
      sessionExpiresAt: sessionRow?.expires_at,
      deviceName: logRow.device_name ?? undefined,
      deviceId: logRow.device_id ?? undefined,
      success: logRow.success,
      reason: logRow.reason ?? undefined,
      verifiedAt: logRow.verified_at,
    };
  });
}

async function refreshCourseStudentCount(courseId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { count } = await supabase
    .from('course_enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);

  await supabase
    .from('courses')
    .update({ total_students: count ?? 0, updated_at: new Date().toISOString() })
    .eq('id', courseId);
}

export async function enrollStudentInCourse(courseId: string, studentId: string): Promise<ManagementResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const { data: existingEnrollment } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existingEnrollment) {
    return {
      success: true,
      message: 'Student is already enrolled in this course.',
    };
  }

  const { error } = await supabase
    .from('course_enrollments')
    .insert({
      course_id: courseId,
      student_id: studentId,
    });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  await refreshCourseStudentCount(courseId);

  return {
    success: true,
    message: 'Student enrolled successfully.',
  };
}

export async function removeStudentFromCourse(courseId: string, studentId: string): Promise<ManagementResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const { error } = await supabase
    .from('course_enrollments')
    .delete()
    .eq('course_id', courseId)
    .eq('student_id', studentId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  await refreshCourseStudentCount(courseId);

  return {
    success: true,
    message: 'Student removed from course.',
  };
}

export async function bulkEnrollStudentsByMatricNumbers(courseId: string, matricNumbers: string[]): Promise<ManagementResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured for this workspace.',
    };
  }

  const normalizedMatricNumbers = Array.from(
    new Set(
      matricNumbers
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );

  if (normalizedMatricNumbers.length === 0) {
    return {
      success: false,
      message: 'Provide at least one matric number.',
    };
  }

  const [{ data: studentProfiles }] = await Promise.all([
    supabase.from('student_profiles').select('user_id, matric_number'),
  ]);

  const studentIdByMatric = new Map<string, string>();

  (studentProfiles ?? []).forEach((row) => {
    const studentRow = row as StudentProfileRow;
    studentIdByMatric.set(studentRow.matric_number.trim().toUpperCase(), studentRow.user_id);
  });

  const alreadyEnrolledIds = new Set<string>();
  const { data: existingEnrollments } = await supabase
    .from('course_enrollments')
    .select('student_id')
    .eq('course_id', courseId);

  (existingEnrollments ?? []).forEach((row) => {
    alreadyEnrolledIds.add((row as CourseEnrollmentRow).student_id);
  });

  const targetStudentIds: string[] = [];
  const missingMatricNumbers: string[] = [];

  normalizedMatricNumbers.forEach((matricNumber) => {
    const studentId = studentIdByMatric.get(matricNumber.toUpperCase());

    if (!studentId) {
      missingMatricNumbers.push(matricNumber);
      return;
    }

    if (!alreadyEnrolledIds.has(studentId)) {
      targetStudentIds.push(studentId);
    }
  });

  if (targetStudentIds.length === 0 && missingMatricNumbers.length === 0) {
    return {
      success: true,
      message: 'All listed students are already enrolled in this course.',
    };
  }

  if (targetStudentIds.length > 0) {
    const { error } = await supabase
      .from('course_enrollments')
      .insert(
        targetStudentIds.map((studentId) => ({
          course_id: courseId,
          student_id: studentId,
        }))
      );

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    await refreshCourseStudentCount(courseId);
  }

  const enrolledCount = targetStudentIds.length;
  const missingCount = missingMatricNumbers.length;
  const alreadyListedCount = normalizedMatricNumbers.length - enrolledCount - missingCount;

  const parts = [];

  if (enrolledCount > 0) {
    parts.push(`${enrolledCount} student${enrolledCount === 1 ? '' : 's'} enrolled`);
  }

  if (missingCount > 0) {
    parts.push(`${missingCount} matric number${missingCount === 1 ? '' : 's'} not found`);
  }

  if (alreadyListedCount > 0) {
    parts.push(`${alreadyListedCount} already enrolled`);
  }

  return {
    success: true,
    message: parts.join('. ') || 'Bulk enrollment completed.',
  };
}

export async function loadAttendanceSnapshot(): Promise<{ activeSessions: ActiveSession[]; attendanceRecords: AttendanceRecord[] }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      activeSessions: [],
      attendanceRecords: [],
    };
  }

  const [{ data: sessions }, { data: records }] = await Promise.all([
    supabase.from('attendance_sessions').select('*').order('created_at', { ascending: false }),
    supabase.from('attendance_records').select('*').order('created_at', { ascending: false }),
  ]);

  return {
    activeSessions: (sessions ?? []).map(row => mapSessionRow(row as AttendanceSessionRow)),
    attendanceRecords: (records ?? []).map(row => mapRecordRow(row as AttendanceRecordRow)),
  };
}

export async function createAttendanceSession(session: ActiveSession): Promise<ActiveSession> {
  if (!isSupabaseConfigured || !supabase) {
    return session;
  }

  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert({
      id: session.id,
      course_id: session.courseId,
      course_code: session.courseCode,
      course_title: session.courseTitle,
      lecturer_id: session.lecturerId,
      lecturer_name: session.lecturerName,
      barcode_data: session.barcodeData,
      created_at: session.createdAt,
      expires_at: session.expiresAt,
      duration_minutes: session.duration,
      scanned_student_ids: session.scannedStudents,
      total_students: session.totalStudents,
      room: session.room,
      is_active: session.isActive,
      requires_bluetooth: session.requiresBluetooth ?? false,
      bluetooth_device_name: session.bluetoothDeviceName ?? null,
      bluetooth_service_uuid: session.bluetoothServiceUuid ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    return {
      ...session,
      scannedStudents: [],
      isActive: true,
    };
  }

  return mapSessionRow(data as AttendanceSessionRow);
}

export async function endAttendanceSession(sessionId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  await supabase
    .from('attendance_sessions')
    .update({ is_active: false })
    .eq('id', sessionId);
}

export async function recordAttendanceScan(params: {
  session: ActiveSession;
  studentId: string;
  studentName: string;
  studentMatric: string;
  bluetoothDeviceName?: string;
  bluetoothDeviceId?: string;
}): Promise<AttendanceRecord | null> {
  const now = new Date();
  const record: AttendanceRecord = {
    id: `att_${Date.now()}`,
    courseId: params.session.courseId,
    courseCode: params.session.courseCode,
    courseTitle: params.session.courseTitle,
    studentId: params.studentId,
    studentName: params.studentName,
    studentMatric: params.studentMatric,
    lecturerId: params.session.lecturerId,
    date: now.toISOString().split('T')[0],
    time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    status: 'present',
    sessionId: params.session.id,
    verificationMode: params.session.requiresBluetooth ? 'bluetooth-qr' : 'qr',
    bluetoothDeviceName: params.bluetoothDeviceName,
    bluetoothDeviceId: params.bluetoothDeviceId,
  };

  if (!isSupabaseConfigured || !supabase) {
    return record;
  }

  const { error: recordError } = await supabase.from('attendance_records').insert({
    id: record.id,
    course_id: record.courseId,
    course_code: record.courseCode,
    course_title: record.courseTitle,
    student_id: record.studentId,
    student_name: record.studentName,
    student_matric: record.studentMatric,
    lecturer_id: record.lecturerId,
    date: record.date,
    time: record.time,
    status: record.status,
    session_id: record.sessionId,
    verification_mode: record.verificationMode,
    bluetooth_device_name: record.bluetoothDeviceName ?? null,
    bluetooth_device_id: record.bluetoothDeviceId ?? null,
  });

  if (recordError) {
    return null;
  }

  const nextScannedStudents = [...params.session.scannedStudents, params.studentId];

  await supabase
    .from('attendance_sessions')
    .update({ scanned_student_ids: nextScannedStudents })
    .eq('id', params.session.id);

  return record;
}

export async function isStudentEnrolledInCourse(studentId: string, courseId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  const { data } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  return !!data;
}

export async function getStudentCourses(studentId: string): Promise<Course[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('student_id', studentId);

  const courseIds = (enrollments ?? []).map(row => (row as CourseEnrollmentRow).course_id);

  if (courseIds.length === 0) return [];

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .in('id', courseIds);

  const { data: schedules } = await supabase
    .from('course_schedules')
    .select('*')
    .in('course_id', courseIds);

  return (courses ?? []).map(course => {
    const courseRow = course as CourseRow;
    const schedule = schedules?.find(item => (item as CourseScheduleRow).course_id === courseRow.id) as CourseScheduleRow | undefined;
    return mapCourseRow(courseRow, schedule);
  });
}

export async function getLecturerCourses(lecturerId: string): Promise<Course[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('lecturer_id', lecturerId);

  const courseIds = (courses ?? []).map(course => (course as CourseRow).id);

  const { data: schedules } = await supabase
    .from('course_schedules')
    .select('*')
    .in('course_id', courseIds);

  return (courses ?? []).map(course => {
    const courseRow = course as CourseRow;
    const schedule = schedules?.find(item => (item as CourseScheduleRow).course_id === courseRow.id) as CourseScheduleRow | undefined;
    return mapCourseRow(courseRow, schedule);
  });
}

export async function getAttendanceForStudent(studentId: string): Promise<AttendanceRecord[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  return (data ?? []).map(row => mapRecordRow(row as AttendanceRecordRow));
}

export async function getAttendanceForCourse(courseId: string): Promise<AttendanceRecord[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  return (data ?? []).map(row => mapRecordRow(row as AttendanceRecordRow));
}

export async function getStudentDetails(studentId: string): Promise<Student | undefined> {
  if (!isSupabaseConfigured || !supabase) {
    return undefined;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .eq('role', 'student')
    .maybeSingle();

  if (!profile) return undefined;

  const { data: details } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', studentId)
    .maybeSingle();

  const enrolledCourses = await getStudentCourses(studentId);

  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    role: 'student',
    department: profile.department,
    avatar: profile.avatar_url ?? undefined,
    matricNumber: (details as StudentProfileRow | undefined)?.matric_number ?? '',
    level: (details as StudentProfileRow | undefined)?.level ?? 0,
    enrolledCourses: enrolledCourses.map(course => course.id),
    attendanceRate: (details as StudentProfileRow | undefined)?.attendance_rate ?? 0,
  };
}

export async function getUserCounts(): Promise<{ totalUsers: number; totalStudents: number; totalLecturers: number; totalAdmins: number }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      totalUsers: 0,
      totalStudents: 0,
      totalLecturers: 0,
      totalAdmins: 0,
    };
  }

  const { count: studentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  const { count: lecturerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'lecturer');
  const { count: adminCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');

  const totalStudents = studentCount ?? 0;
  const totalLecturers = lecturerCount ?? 0;
  const totalAdmins = adminCount ?? 0;

  return {
    totalUsers: totalStudents + totalLecturers + totalAdmins,
    totalStudents,
    totalLecturers,
    totalAdmins,
  };
}

export function subscribeToAttendanceChanges(
  onSessionChange: (session: ActiveSession) => void,
  onRecordChange: (record: AttendanceRecord) => void,
): (() => void) | undefined {
  if (!isSupabaseConfigured || !supabase) return undefined;

  const channel = supabase.channel('attendance-realtime');

  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, payload => {
    if (payload.new) {
      onSessionChange(mapSessionRow(payload.new as AttendanceSessionRow));
    }
  });

  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, payload => {
    if (payload.new) {
      onRecordChange(mapRecordRow(payload.new as AttendanceRecordRow));
    }
  });

  channel.subscribe();

  return () => {
    void supabase?.removeChannel(channel);
  };
}

export function subscribeToTableChanges(tables: string[], onChange: () => void): (() => void) | undefined {
  if (!isSupabaseConfigured || !supabase || tables.length === 0) return undefined;

  const channel = supabase.channel(`table-refresh:${tables.join(',')}`);

  tables.forEach((table) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      onChange();
    });
  });

  channel.subscribe();

  return () => {
    void supabase?.removeChannel(channel);
  };
}

export async function getDepartmentDistribution(): Promise<Array<{ name: string; value: number; color: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data } = await supabase
    .from('profiles')
    .select('department');

  const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6'];
  const counts = new Map<string, number>();

  (data ?? []).forEach((row) => {
    const department = (row as { department?: string | null }).department?.trim();
    if (!department) return;
    counts.set(department, (counts.get(department) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, value], index) => ({
      name,
      value,
      color: palette[index % palette.length],
    }));
}