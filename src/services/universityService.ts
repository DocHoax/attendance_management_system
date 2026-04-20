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

export async function updateProfileInDatabase(user: User, updates: Partial<Pick<User, 'name' | 'email' | 'department' | 'avatar'>>): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) {
    return { ...user, ...updates } as User;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: updates.name,
      email: updates.email,
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