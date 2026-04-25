import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Activity, 
  Shield, 
  TrendingUp,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Bluetooth,
  Search,
  Filter,
  Download,
  BarChart3,
  BookOpen,
  GraduationCap,
  UserCircle,
  Play,
  Plus,
  UserPlus,
  Trash2,
  Copy,
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAuthHooks';
import { useAttendance } from '@/hooks/useAttendance';
import { useToast } from '@/hooks/useToast';
import { StatCard } from '@/components/ui/StatCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  createCourse,
  bulkCreateCoursesFromText,
  bulkEnrollStudentsByMatricNumbers,
  getBluetoothVerificationLogs,
  enrollStudentInCourse,
  getAllCourses,
  getAllLecturers,
  getAllStudents,
  getDepartmentDistribution, 
  getUserCounts, 
  removeStudentFromCourse,
  deleteCourse,
  updateCourse,
  subscribeToTableChanges 
} from '@/services/universityService';
import type { BluetoothVerificationLog } from '@/services/universityService';
import type { Course, Lecturer, Student } from '@/types';
import { buildAttendanceHistoryEntries, type AttendanceHistoryMode } from '@/lib/attendanceHistory';

type CourseFormState = {
  code: string;
  title: string;
  description: string;
  lecturerId: string;
  department: string;
  level: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  color: string;
};

type CourseImportPreviewRow = {
  lineNumber: number;
  code: string;
  title: string;
  lecturerIdentifier: string;
  department: string;
  level: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  color: string;
  valid: boolean;
  reason?: string;
};

const INITIAL_COURSE_FORM: CourseFormState = {
  code: '',
  title: '',
  description: '',
  lecturerId: '',
  department: '',
  level: '100',
  dayOfWeek: 'Monday',
  startTime: '09:00',
  endTime: '10:00',
  room: '',
  color: '#3b82f6',
};

const COURSE_IMPORT_TEMPLATE = [
  'code|title|description|lecturer email or staff ID|department|level|day|start|end|room|color',
  'CSC 401|Software Engineering|Builds maintainable software|dr.adams@school.edu|Computer Science|400|Monday|09:00|11:00|Hall A|#3b82f6',
  'MTH 203|Linear Algebra|Matrices, vectors, and systems|staff-102|Mathematics|200|Tuesday|10:00|12:00|Room 3|#10b981',
].join('\n');

export function AdminDashboard() {
  const admin = useAdmin();
  const { activeSessions, attendanceRecords } = useAttendance();
  const { success, error } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [attendanceTrendRange, setAttendanceTrendRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrollmentCourseId, setEnrollmentCourseId] = useState('');
  const [enrollmentStudentId, setEnrollmentStudentId] = useState('');
  const [bulkEnrollmentInput, setBulkEnrollmentInput] = useState('');
  const [bulkCourseImportInput, setBulkCourseImportInput] = useState('');
  const [editingCourseId, setEditingCourseId] = useState('');
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isSavingEnrollment, setIsSavingEnrollment] = useState(false);
  const [isSavingBulkEnrollment, setIsSavingBulkEnrollment] = useState(false);
  const [isSavingBulkCourseImport, setIsSavingBulkCourseImport] = useState(false);
  const [bluetoothLogs, setBluetoothLogs] = useState<BluetoothVerificationLog[]>([]);
  const [bluetoothSearchQuery, setBluetoothSearchQuery] = useState('');
  const [bluetoothStatusFilter, setBluetoothStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [selectedBluetoothLog, setSelectedBluetoothLog] = useState<BluetoothVerificationLog | null>(null);
  const [attendanceHistorySearch, setAttendanceHistorySearch] = useState('');
  const [attendanceHistoryMode, setAttendanceHistoryMode] = useState<'all' | AttendanceHistoryMode>('all');
  const [courseForm, setCourseForm] = useState<CourseFormState>(INITIAL_COURSE_FORM);
  const [userCounts, setUserCounts] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalLecturers: 0,
    totalAdmins: 0,
  });
  const [departmentData, setDepartmentData] = useState<Array<{ name: string; value: number; color: string }>>([]);

  const refreshManagementData = useCallback(async () => {
    const [nextCourses, nextLecturers, nextStudents] = await Promise.all([
      getAllCourses(),
      getAllLecturers(),
      getAllStudents(),
    ]);

    setCourses(nextCourses);
    setLecturers(nextLecturers);
    setStudents(nextStudents);

    setSelectedCourseId((currentValue) => currentValue || nextCourses[0]?.id || '');
    setEnrollmentCourseId((currentValue) => currentValue || nextCourses[0]?.id || '');
    setEnrollmentStudentId((currentValue) => currentValue || nextStudents[0]?.id || '');
    setCourseForm((currentValue) => ({
      ...currentValue,
      lecturerId: currentValue.lecturerId || nextLecturers[0]?.id || '',
      department: currentValue.department || nextLecturers[0]?.department || '',
      room: currentValue.room || '',
    }));
  }, []);

  const refreshBluetoothLogs = useCallback(async () => {
    const nextLogs = await getBluetoothVerificationLogs(8);
    setBluetoothLogs(nextLogs);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const refreshCounts = () => {
      void getUserCounts().then((counts) => {
        if (isMounted) {
          setUserCounts(counts);
        }
      });
    };

    const refreshDepartments = () => {
      void getDepartmentDistribution().then((nextDepartments) => {
        if (isMounted) {
          setDepartmentData(nextDepartments);
        }
      });
    };

    const refreshCatalog = () => {
      refreshManagementData();
    };

    refreshCounts();
    refreshDepartments();
    refreshCatalog();
    void refreshBluetoothLogs();
    const cleanup = subscribeToTableChanges(['profiles', 'courses', 'course_schedules', 'course_enrollments', 'student_profiles', 'lecturer_profiles', 'bluetooth_verifications'], () => {
      refreshCounts();
      refreshDepartments();
      refreshCatalog();
      void refreshBluetoothLogs();
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [refreshBluetoothLogs, refreshManagementData]);

  const weeklyData = useMemo(() => {
    const rangeDays = attendanceTrendRange === '14d' ? 14 : attendanceTrendRange === '30d' ? 30 : 7;

    const days = Array.from({ length: rangeDays }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - ((rangeDays - 1) - index));
      return {
        key: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    });

    return days.map(({ key, label }) => {
      const attendance = attendanceRecords.filter((record) => record.date === key).length;
      const expected = activeSessions
        .filter((session) => session.createdAt.split('T')[0] === key)
        .reduce((total, session) => total + session.totalStudents, 0);

      return {
        day: label,
        attendance,
        expected: expected > 0 ? expected : attendance,
      };
    });
  }, [activeSessions, attendanceRecords, attendanceTrendRange]);

  // Calculate stats
  const activeClassesToday = activeSessions.filter(s => s.isActive).length;
  const todayRecords = attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0]);
  const todayAttendanceRate = todayRecords.length > 0
    ? Math.round((todayRecords.filter(r => r.status === 'present').length / todayRecords.length) * 100)
    : 0;

  // Filter active sessions
  const filteredSessions = activeSessions.filter(session => {
    const matchesSearch = 
      session.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lecturerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.room.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !showActiveOnly || session.isActive;
    return matchesSearch && matchesStatus;
  });

  const filteredCourses = useMemo(() => {
    const query = courseSearchQuery.trim().toLowerCase();

    if (!query) {
      return courses;
    }

    return courses.filter((course) => {
      const searchTarget = [
        course.code,
        course.title,
        course.department,
        course.lecturerName,
        course.schedule.day,
        course.schedule.room,
      ]
        .join(' ')
        .toLowerCase();

      return searchTarget.includes(query);
    });
  }, [courseSearchQuery, courses]);

  const filteredBluetoothLogs = useMemo(() => {
    const query = bluetoothSearchQuery.trim().toLowerCase();

    return bluetoothLogs.filter((log) => {
      const searchTarget = [
        log.studentName,
        log.studentEmail,
        log.studentMatric,
        log.studentDepartment,
        log.studentId,
        log.sessionCourseCode,
        log.sessionCourseTitle,
        log.sessionLecturerName,
        log.sessionRoom,
        log.sessionId,
        log.deviceName,
        log.deviceId,
        log.reason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = query.length === 0 || searchTarget.includes(query);
      const matchesStatus = bluetoothStatusFilter === 'all' || (bluetoothStatusFilter === 'success' ? log.success : !log.success);

      return matchesQuery && matchesStatus;
    });
  }, [bluetoothLogs, bluetoothSearchQuery, bluetoothStatusFilter]);

  const attendanceHistoryEntries = useMemo(
    () => buildAttendanceHistoryEntries(attendanceRecords, bluetoothLogs),
    [attendanceRecords, bluetoothLogs],
  );

  const filteredAttendanceHistory = useMemo(() => {
    const query = attendanceHistorySearch.trim().toLowerCase();

    return attendanceHistoryEntries.filter((entry) => {
      const searchTarget = [
        entry.title,
        entry.subtitle,
        entry.studentLabel,
        entry.sessionLabel,
        entry.deviceLabel,
        entry.reason,
        entry.mode,
        entry.kind,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = query.length === 0 || searchTarget.includes(query);
      const matchesMode = attendanceHistoryMode === 'all' || entry.mode === attendanceHistoryMode;

      return matchesQuery && matchesMode;
    });
  }, [attendanceHistoryEntries, attendanceHistoryMode, attendanceHistorySearch]);

  const systemLogs = useMemo(() => {
    const sessionLogs = activeSessions.map((session) => ({
      id: `session-${session.id}`,
      action: session.isActive ? 'Session Started' : 'Session Closed',
      user: session.lecturerName,
      details: `${session.courseCode} - ${session.courseTitle}`,
      time: session.createdAt,
    }));

    const attendanceLogs = attendanceRecords.map((record) => ({
      id: `record-${record.id}`,
      action: 'Attendance Marked',
      user: record.studentName,
      details: `Scanned for ${record.courseCode}`,
      time: `${record.date}T${record.time}:00`,
    }));

    return [...sessionLogs, ...attendanceLogs]
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 5)
      .map((log) => ({
        ...log,
        time: new Date(log.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      }));
  }, [activeSessions, attendanceRecords]);

  const handleExportReport = () => {
    const escapeCsv = (value: string | number | boolean | null | undefined) => {
      const text = value == null ? '' : String(value);

      if (/["]|,|\n/.test(text)) {
        return `"${text.replaceAll('"', '""')}"`;
      }

      return text;
    };

    const rows = [
      ['type', 'id', 'label', 'courseCode', 'person', 'date', 'time', 'status', 'details'].map(escapeCsv).join(','),
      ...activeSessions.map((session) => [
        'session',
        session.id,
        session.courseTitle,
        session.courseCode,
        session.lecturerName,
        session.createdAt.split('T')[0],
        new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        session.isActive ? 'active' : 'ended',
        `${session.scannedStudents.length}/${session.totalStudents} scanned`,
      ].map(escapeCsv).join(',')),
      ...attendanceRecords.map((record) => [
        'record',
        record.id,
        record.courseTitle,
        record.courseCode,
        record.studentName,
        record.date,
        record.time,
        record.status,
        record.verificationMode ?? 'qr',
      ].map(escapeCsv).join(',')),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    success('Attendance report exported.');
  };

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const selectedCourseActiveSession = selectedCourseId
    ? activeSessions.find((session) => session.courseId === selectedCourseId && session.isActive)
    : undefined;
  const selectedCourseStudents = selectedCourseId
    ? students.filter((student) => student.enrolledCourses.includes(selectedCourseId))
    : [];
  const bulkCourseImportPreview = useMemo<CourseImportPreviewRow[]>(() => {
    const rows = bulkCourseImportInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (rows.length === 0) {
      return [];
    }

    if (rows[0].toLowerCase().includes('code') && rows[0].toLowerCase().includes('title') && rows[0].toLowerCase().includes('lecturer')) {
      rows.shift();
    }

    return rows.map((line, index) => {
      const parts = line.split('|').map((part) => part.trim());
      const [code, title, description, lecturerIdentifier, department, level, dayOfWeek, startTime, endTime, room, color = '#3b82f6'] = parts;

      if (parts.length < 10) {
        return {
          lineNumber: index + 1,
          code: code ?? '',
          title: title ?? '',
          lecturerIdentifier: lecturerIdentifier ?? '',
          department: department ?? '',
          level: level ?? '',
          dayOfWeek: dayOfWeek ?? '',
          startTime: startTime ?? '',
          endTime: endTime ?? '',
          room: room ?? '',
          color,
          valid: false,
          reason: 'Expected 10 or 11 pipe-separated values.',
        };
      }

      if (!code || !title || !description || !lecturerIdentifier || !department || !level || !dayOfWeek || !startTime || !endTime || !room) {
        return {
          lineNumber: index + 1,
          code: code ?? '',
          title: title ?? '',
          lecturerIdentifier: lecturerIdentifier ?? '',
          department: department ?? '',
          level: level ?? '',
          dayOfWeek: dayOfWeek ?? '',
          startTime: startTime ?? '',
          endTime: endTime ?? '',
          room: room ?? '',
          color,
          valid: false,
          reason: 'Missing one or more required values.',
        };
      }

      const lecturerMatch = lecturers.find((lecturer) => {
        const normalizedIdentifier = lecturerIdentifier.trim().toLowerCase();

        return (
          lecturer.id.toLowerCase() === normalizedIdentifier ||
          lecturer.email.toLowerCase() === normalizedIdentifier ||
          lecturer.staffId.toLowerCase() === normalizedIdentifier ||
          lecturer.name.toLowerCase() === normalizedIdentifier
        );
      });

      if (!lecturerMatch) {
        return {
          lineNumber: index + 1,
          code,
          title,
          lecturerIdentifier,
          department,
          level,
          dayOfWeek,
          startTime,
          endTime,
          room,
          color,
          valid: false,
          reason: 'Lecturer not found by email, staff ID, name, or profile ID.',
        };
      }

      return {
        lineNumber: index + 1,
        code,
        title,
        lecturerIdentifier,
        department,
        level,
        dayOfWeek,
        startTime,
        endTime,
        room,
        color,
        valid: true,
      };
    });
  }, [bulkCourseImportInput, lecturers]);

  const bulkCourseImportValidCount = bulkCourseImportPreview.filter((row) => row.valid).length;
  const bulkCourseImportInvalidCount = bulkCourseImportPreview.length - bulkCourseImportValidCount;
  const bulkMatricNumbers = useMemo(
    () =>
      Array.from(
        new Set(
          bulkEnrollmentInput
            .split(/[\s,;]+/)
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        )
      ),
    [bulkEnrollmentInput]
  );

  const loadCourseIntoForm = (course: Course) => {
    setSelectedCourseId(course.id);
    setEditingCourseId(course.id);
    setCourseForm({
      code: course.code,
      title: course.title,
      description: course.description,
      lecturerId: course.lecturerId,
      department: course.department,
      level: String(course.level),
      dayOfWeek: course.schedule.day,
      startTime: course.schedule.startTime,
      endTime: course.schedule.endTime,
      room: course.schedule.room,
      color: course.color,
    });
  };

  const handleSubmitCourse = async () => {
    const lecturer = lecturers.find((item) => item.id === courseForm.lecturerId);

    if (!lecturer) {
      error('Select a lecturer before creating the course.');
      return;
    }

    if (!courseForm.code.trim() || !courseForm.title.trim() || !courseForm.description.trim() || !courseForm.department.trim() || !courseForm.room.trim()) {
      error('Fill in the course code, title, description, department, and room.');
      return;
    }

    setIsSavingCourse(true);
    const payload = {
      code: courseForm.code.trim(),
      title: courseForm.title.trim(),
      description: courseForm.description.trim(),
      lecturerId: lecturer.id,
      lecturerName: lecturer.name,
      department: courseForm.department.trim(),
      level: Number.parseInt(courseForm.level, 10) || 100,
      dayOfWeek: courseForm.dayOfWeek,
      startTime: courseForm.startTime,
      endTime: courseForm.endTime,
      room: courseForm.room.trim(),
      color: courseForm.color,
    };

    const result = editingCourseId
      ? await updateCourse({ ...payload, courseId: editingCourseId })
      : await createCourse(payload);
    setIsSavingCourse(false);

    if (!result.success) {
      error(result.message);
      return;
    }

    success(result.message);
    setEditingCourseId('');
    setCourseForm(INITIAL_COURSE_FORM);
    refreshManagementData();
  };

  const handleDeleteSelectedCourse = async () => {
    if (!selectedCourse) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedCourse.code}? This will remove the course and its enrollments.`);

    if (!confirmed) {
      return;
    }

    const result = await deleteCourse(selectedCourse.id);

    if (!result.success) {
      error(result.message);
      return;
    }

    success(result.message);
    setSelectedCourseId('');
    setEditingCourseId('');
    setCourseForm(INITIAL_COURSE_FORM);
    refreshManagementData();
  };

  const handleEnrollStudent = async () => {
    if (!enrollmentCourseId || !enrollmentStudentId) {
      error('Choose both a course and a student before enrolling.');
      return;
    }

    setIsSavingEnrollment(true);
    const result = await enrollStudentInCourse(enrollmentCourseId, enrollmentStudentId);
    setIsSavingEnrollment(false);

    if (!result.success) {
      error(result.message);
      return;
    }

    success(result.message);
    setEnrollmentStudentId('');
    refreshManagementData();
  };

  const handleRemoveEnrollment = async (courseId: string, studentId: string) => {
    const result = await removeStudentFromCourse(courseId, studentId);

    if (!result.success) {
      error(result.message);
      return;
    }

    success(result.message);
    refreshManagementData();
  };

  const handleBulkEnrollStudents = async () => {
    if (!enrollmentCourseId) {
      error('Choose a course before bulk enrolling students.');
      return;
    }

    if (bulkMatricNumbers.length === 0) {
      error('Paste one or more matric numbers first.');
      return;
    }

    setIsSavingBulkEnrollment(true);
    const result = await bulkEnrollStudentsByMatricNumbers(enrollmentCourseId, bulkMatricNumbers);
    setIsSavingBulkEnrollment(false);

    if (!result.success) {
      error(result.message);
      return;
    }

    success(result.message);
    setBulkEnrollmentInput('');
    refreshManagementData();
  };

  const handleBulkCourseImport = async () => {
    if (!bulkCourseImportInput.trim()) {
      error('Paste one or more course rows first.');
      return;
    }

    setIsSavingBulkCourseImport(true);
    const result = await bulkCreateCoursesFromText(bulkCourseImportInput);
    setIsSavingBulkCourseImport(false);

    if (!result.success) {
      error(result.message);
      return;
    }

    success(result.message);
    setBulkCourseImportInput('');
    refreshManagementData();
  };

  const handleDownloadCourseTemplate = () => {
    const blob = new Blob([COURSE_IMPORT_TEMPLATE], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'course-import-template.txt';
    link.click();
    URL.revokeObjectURL(url);
    success('Template downloaded.');
  };

  const handleCopyAttendanceDetails = async () => {
    if (!selectedCourse) {
      return;
    }

    const details = selectedCourseActiveSession
      ? [
          `Course: ${selectedCourse.code} - ${selectedCourse.title}`,
          `Session ID: ${selectedCourseActiveSession.id}`,
          `Lecturer: ${selectedCourseActiveSession.lecturerName}`,
          `Room: ${selectedCourseActiveSession.room}`,
          `Status: Active`,
        ].join('\n')
      : [
          `Course: ${selectedCourse.code} - ${selectedCourse.title}`,
          `Lecturer: ${selectedCourse.lecturerName}`,
          `Room: ${selectedCourse.schedule.room}`,
          'Status: No active session',
        ].join('\n');

    try {
      await navigator.clipboard.writeText(details);
      success('Attendance details copied to clipboard.');
    } catch {
      error('Unable to copy attendance details.');
    }
  };

  if (!admin) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>

        {/* Course Management */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Course and Enrollment Management
              </h3>
              <p className="text-sm text-muted-foreground">Create courses, assign lecturers, and enroll students from the dashboard.</p>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/30">
              {courses.length} courses, {students.length} students, {lecturers.length} lecturers
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="glass-card p-6 space-y-5">
              <div>
                <h4 className="text-base font-semibold text-white">Create Course</h4>
                <p className="text-sm text-muted-foreground">Add a new course and schedule it in one step.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Course code</label>
                  <Input value={courseForm.code} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, code: event.target.value }))} placeholder="CSC 401" className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Title</label>
                  <Input value={courseForm.title} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, title: event.target.value }))} placeholder="Software Engineering" className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Description</label>
                <Textarea value={courseForm.description} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, description: event.target.value }))} placeholder="Course overview and goals" className="min-h-24 bg-slate-800 border-slate-700 text-white" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Lecturer</label>
                  <select
                    value={courseForm.lecturerId}
                    onChange={(event) => {
                      const nextLecturer = lecturers.find((item) => item.id === event.target.value);
                      setCourseForm((currentValue) => ({
                        ...currentValue,
                        lecturerId: event.target.value,
                        department: nextLecturer?.department || currentValue.department,
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-primary"
                  >
                    <option value="">Select lecturer</option>
                    {lecturers.map((lecturer) => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.name} - {lecturer.department}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Department</label>
                  <Input value={courseForm.department} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, department: event.target.value }))} placeholder="Computer Science" className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Level</label>
                  <Input value={courseForm.level} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, level: event.target.value }))} type="number" min="100" step="100" className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Day</label>
                  <select value={courseForm.dayOfWeek} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, dayOfWeek: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-primary">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Start</label>
                  <Input value={courseForm.startTime} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, startTime: event.target.value }))} type="time" className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">End</label>
                  <Input value={courseForm.endTime} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, endTime: event.target.value }))} type="time" className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Room</label>
                  <Input value={courseForm.room} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, room: event.target.value }))} placeholder="Hall A" className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Color</label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5">
                    <input type="color" value={courseForm.color} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, color: event.target.value }))} className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                    <Input value={courseForm.color} onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, color: event.target.value }))} className="border-0 bg-transparent p-0 text-white shadow-none focus-visible:ring-0" />
                  </div>
                </div>
              </div>

              {editingCourseId && (
                <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                  Editing {selectedCourse?.code || 'course'}.
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCourseId('');
                      setCourseForm(INITIAL_COURSE_FORM);
                    }}
                    className="ml-3 underline underline-offset-4"
                  >
                    Cancel edit
                  </button>
                </div>
              )}

              <Button onClick={handleSubmitCourse} disabled={isSavingCourse || lecturers.length === 0} className="btn-glow bg-gradient-to-r from-primary to-secondary">
                <Plus className="mr-2 h-4 w-4" />
                {isSavingCourse ? (editingCourseId ? 'Updating...' : 'Creating...') : editingCourseId ? 'Update Course' : 'Create Course'}
              </Button>
            </div>

            <div className="glass-card p-6 space-y-5">
              <div>
                <h4 className="text-base font-semibold text-white">Bulk Course Import</h4>
                <p className="text-sm text-muted-foreground">Paste one course per line using pipe separators.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4 text-xs text-muted-foreground space-y-2">
                <p className="text-white">Format</p>
                <p>code|title|description|lecturer email or staff ID|department|level|day|start|end|room|color</p>
                <p>Example: CSC 401|Software Engineering|Builds maintainable software|dr.adams@school.edu|Computer Science|400|Monday|09:00|11:00|Hall A|#3b82f6</p>
              </div>

              <Textarea
                value={bulkCourseImportInput}
                onChange={(event) => setBulkCourseImportInput(event.target.value)}
                placeholder={`CSC 401|Software Engineering|Builds maintainable software|dr.adams@school.edu|Computer Science|400|Monday|09:00|11:00|Hall A|#3b82f6\nMTH 203|Linear Algebra|Matrices, vectors, and systems|staff-102|Mathematics|200|Tuesday|10:00|12:00|Room 3|#10b981`}
                className="min-h-40 bg-slate-800 border-slate-700 text-white"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{bulkCourseImportInput.split(/\r?\n/).filter((line) => line.trim().length > 0).length} line{bulkCourseImportInput.split(/\r?\n/).filter((line) => line.trim().length > 0).length === 1 ? '' : 's'} queued</span>
                <span>Lecturer identifiers can be email, staff ID, name, or profile ID.</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleDownloadCourseTemplate} variant="outline" className="border-white/10">
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
                <Button
                  onClick={handleBulkCourseImport}
                  disabled={isSavingBulkCourseImport || lecturers.length === 0 || bulkCourseImportPreview.length === 0}
                  variant="outline"
                  className="border-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isSavingBulkCourseImport ? 'Importing...' : 'Import Courses'}
                </Button>
              </div>

              {bulkCourseImportPreview.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-white">Import Preview</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-success/15 px-2.5 py-1 text-success">{bulkCourseImportValidCount} valid</span>
                      <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-destructive">{bulkCourseImportInvalidCount} invalid</span>
                    </div>
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {bulkCourseImportPreview.map((row) => (
                      <div key={row.lineNumber} className={`rounded-2xl border p-4 ${row.valid ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">Line {row.lineNumber}: {row.code || 'Missing code'}</p>
                            <p className="text-xs text-muted-foreground">{row.title || 'No title provided'} • {row.department || 'No department provided'}</p>
                          </div>
                          <Badge className={row.valid ? 'border-success/30 bg-success/15 text-success' : 'border-destructive/30 bg-destructive/15 text-destructive'}>
                            {row.valid ? 'Ready' : 'Fix needed'}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                          <p>Lecturer: {row.lecturerIdentifier || 'missing'}</p>
                          <p>Schedule: {row.dayOfWeek || 'missing'} {row.startTime || '--:--'} - {row.endTime || '--:--'}</p>
                          <p>Room: {row.room || 'missing'}</p>
                          <p>Color: {row.color || 'missing'}</p>
                        </div>
                        {!row.valid && row.reason && (
                          <p className="mt-3 text-xs text-destructive">{row.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card p-6 space-y-5">
              <div>
                <h4 className="text-base font-semibold text-white">Enroll Student</h4>
                <p className="text-sm text-muted-foreground">Attach students to a course so attendance checks can work.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Course</label>
                  <select value={enrollmentCourseId} onChange={(event) => setEnrollmentCourseId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-primary">
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Student</label>
                  <select value={enrollmentStudentId} onChange={(event) => setEnrollmentStudentId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-primary">
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} - {student.matricNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Students enrolled in a course will immediately appear in the attendance eligibility checks.
                </p>
              </div>

              <Button onClick={handleEnrollStudent} disabled={isSavingEnrollment || courses.length === 0 || students.length === 0} variant="outline" className="border-white/10">
                <UserPlus className="mr-2 h-4 w-4" />
                {isSavingEnrollment ? 'Enrolling...' : 'Enroll Student'}
              </Button>

              <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4 space-y-3">
                <div>
                  <p className="font-medium text-white">Bulk enroll by matric number</p>
                  <p className="text-sm text-muted-foreground">Paste one matric number per line, or separate them with commas.</p>
                </div>

                <Textarea
                  value={bulkEnrollmentInput}
                  onChange={(event) => setBulkEnrollmentInput(event.target.value)}
                  placeholder={`MAT/20260001\nMAT/20260002\nMAT/20260003`}
                  className="min-h-32 bg-slate-800 border-slate-700 text-white"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{bulkMatricNumbers.length} unique matric number{bulkMatricNumbers.length === 1 ? '' : 's'} queued</span>
                  <span>Existing enrollments will be skipped automatically.</span>
                </div>

                <Button
                  onClick={handleBulkEnrollStudents}
                  disabled={isSavingBulkEnrollment || bulkMatricNumbers.length === 0 || courses.length === 0}
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {isSavingBulkEnrollment ? 'Bulk enrolling...' : 'Bulk Enroll Students'}
                </Button>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-base font-semibold text-white">Current Course Rosters</h4>
                <p className="text-sm text-muted-foreground">Choose a course to review or remove enrolled students.</p>
              </div>
              <div className="space-y-3 md:w-96">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={courseSearchQuery}
                    onChange={(event) => setCourseSearchQuery(event.target.value)}
                    placeholder="Search courses by code, title, lecturer, or room"
                    className="pl-10 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-primary">
                  <option value="">Select course to review</option>
                  {filteredCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredCourses.length} of {courses.length} courses.
                </p>
              </div>
            </div>

            {courses.length > 0 && filteredCourses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-5 text-sm text-muted-foreground">
                No courses match the current search. Clear the filter to show all roster entries.
              </div>
            )}

            {selectedCourse ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-white/10 bg-slate-800/50 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h5 className="text-lg font-semibold text-white">{selectedCourse.code}</h5>
                      <p className="text-sm text-muted-foreground">{selectedCourse.title}</p>
                    </div>
                    <Badge className="bg-success/15 text-success border-success/30">
                      {selectedCourse.totalStudents} enrolled
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10"
                      onClick={() => loadCourseIntoForm(selectedCourse)}
                    >
                      Load into form
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleDeleteSelectedCourse}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete course
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lecturer</p>
                      <p className="mt-1 text-sm font-medium text-white">{selectedCourse.lecturerName}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Schedule</p>
                      <p className="mt-1 text-sm font-medium text-white">{selectedCourse.schedule.day} • {selectedCourse.schedule.startTime} - {selectedCourse.schedule.endTime}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedCourseStudents.length > 0 ? (
                      selectedCourseStudents.map((student) => (
                        <div key={student.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium text-white">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.matricNumber} • {student.department}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="w-fit text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveEnrollment(selectedCourse.id, student.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-muted-foreground">
                        No students are enrolled in this course yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-800/50 p-5 space-y-4">
                  <h5 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Course Summary</h5>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-900/40 px-4 py-3">
                      <span>Department</span>
                      <span className="text-white">{selectedCourse.department}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-900/40 px-4 py-3">
                      <span>Level</span>
                      <span className="text-white">{selectedCourse.level}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-900/40 px-4 py-3">
                      <span>Room</span>
                      <span className="text-white">{selectedCourse.schedule.room}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-900/40 px-4 py-3">
                      <span>Attendance access</span>
                      <div className="flex items-center gap-2">
                        <span className={selectedCourseActiveSession ? 'text-success' : 'text-muted-foreground'}>
                          {selectedCourseActiveSession ? 'Live session' : 'No live session'}
                        </span>
                        <Button variant="ghost" size="sm" className="h-8 gap-2 px-3 text-white hover:bg-white/5" onClick={handleCopyAttendanceDetails}>
                          <Copy className="h-4 w-4" />
                          Copy details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-800/30 p-8 text-center text-sm text-muted-foreground">
                Create a course first, then select it here to inspect the roster and remove enrollments.
              </div>
            )}
          </div>
        </motion.section>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {admin.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-white">System Online</span>
          </div>
          <Button variant="outline" size="sm" className="border-white/10" onClick={handleExportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={userCounts.totalUsers}
          subtitle={`${userCounts.totalStudents} students, ${userCounts.totalLecturers} lecturers`}
          icon={Users}
          color="primary"
          delay={0}
        />
        <StatCard
          title="Active Classes"
          value={activeClassesToday}
          subtitle="Currently in session"
          icon={Activity}
          color="success"
          delay={0.1}
        />
        <StatCard
          title="Today's Attendance"
          value={`${todayAttendanceRate}%`}
          subtitle="University-wide average"
          icon={TrendingUp}
          color="warning"
          trend="up"
          trendValue="+3%"
          delay={0.2}
        />
        <StatCard
          title="System Uptime"
          value="99.9%"
          subtitle="Last 30 days"
          icon={Shield}
          color="secondary"
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Attendance Trend
            </h3>
            <select
              value={attendanceTrendRange}
              onChange={(event) => setAttendanceTrendRange(event.target.value as '7d' | '14d' | '30d')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expected" 
                  stroke="#334155" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Department Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-secondary" />
            Department Distribution
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {departmentData.map((dept, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                  <span className="text-muted-foreground">{dept.name}</span>
                </div>
                <span className="text-white font-medium">{dept.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Live Monitoring Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-success" />
              Live Session Monitoring
            </h3>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Button
                variant={showActiveOnly ? 'default' : 'outline'}
                size="icon"
                className={showActiveOnly ? 'bg-primary text-primary-foreground' : 'border-white/10'}
                onClick={() => setShowActiveOnly((value) => !value)}
                title={showActiveOnly ? 'Showing active sessions only' : 'Show only active sessions'}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Course</TableHead>
                <TableHead className="text-muted-foreground">Lecturer</TableHead>
                <TableHead className="text-muted-foreground">Room</TableHead>
                <TableHead className="text-muted-foreground">Started</TableHead>
                <TableHead className="text-muted-foreground">Attendance</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => (
                  <TableRow key={session.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{session.courseCode}</p>
                        <p className="text-sm text-muted-foreground">{session.courseTitle}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          <UserCircle className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-white">{session.lecturerName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {session.room}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {session.scannedStudents.length}/{session.totalStudents}
                        </span>
                        <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-success rounded-full"
                            style={{ width: `${(session.scannedStudents.length / session.totalStudents) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.isActive ? (
                        <Badge className="bg-success/20 text-success border-success/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-success mr-1 animate-pulse" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-700 text-muted-foreground">
                          Ended
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No active sessions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Bluetooth Verification Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="glass-card p-6"
      >
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bluetooth className="w-5 h-5 text-primary" />
              Bluetooth Verification Audit
            </h3>
            <p className="text-sm text-muted-foreground">Search by student, session, device, or reason and open any entry for full context.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-success/15 px-2.5 py-1 text-success">
              {bluetoothLogs.filter((log) => log.success).length} success
            </span>
            <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-destructive">
              {bluetoothLogs.filter((log) => !log.success).length} failed
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white">
              {filteredBluetoothLogs.length}/{bluetoothLogs.length || 0} shown
            </span>
          </div>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={bluetoothSearchQuery}
              onChange={(event) => setBluetoothSearchQuery(event.target.value)}
              placeholder="Search student, session, device, or reason"
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={bluetoothStatusFilter}
              onChange={(event) => setBluetoothStatusFilter(event.target.value as 'all' | 'success' | 'failed')}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-3 text-sm text-white outline-none transition-colors focus:border-primary"
            >
              <option value="all">All results</option>
              <option value="success">Success only</option>
              <option value="failed">Failed only</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredBluetoothLogs.length > 0 ? (
            filteredBluetoothLogs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => setSelectedBluetoothLog(log)}
                className="w-full rounded-2xl border border-white/10 bg-slate-800/50 p-4 text-left transition-all hover:border-primary/40 hover:bg-slate-800/70"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${log.success ? 'bg-success/20' : 'bg-destructive/20'}`}>
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {log.studentName || log.studentMatric || log.studentEmail || log.studentId}
                        <span className="ml-2 text-xs text-muted-foreground">{log.success ? 'Bluetooth verified' : 'Bluetooth verification failed'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.sessionCourseCode || 'Unknown session'}{log.sessionCourseTitle ? ` • ${log.sessionCourseTitle}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground md:text-right">
                    <p>{log.deviceName || 'Unknown device'}{log.deviceId ? ` • ${log.deviceId}` : ''}</p>
                    <p>{new Date(log.verifiedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <p>{log.sessionRoom || 'Unknown room'}{log.sessionLecturerName ? ` • ${log.sessionLecturerName}` : ''}</p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-800/30 p-8 text-center text-sm text-muted-foreground">
              {bluetoothLogs.length > 0 ? 'No Bluetooth verification attempts match the current search.' : 'No Bluetooth verification attempts recorded yet.'}
            </div>
          )}
        </div>
      </motion.div>

      <Dialog open={Boolean(selectedBluetoothLog)} onOpenChange={(open) => !open && setSelectedBluetoothLog(null)}>
        <DialogContent className="max-w-2xl border border-white/10 bg-slate-950 text-white shadow-2xl">
          {selectedBluetoothLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Bluetooth className="h-5 w-5 text-primary" />
                  Bluetooth Verification Details
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Review the student, session, and device context for this verification attempt.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Student</h4>
                    <Badge className={selectedBluetoothLog.success ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'}>
                      {selectedBluetoothLog.success ? 'Verified' : 'Failed'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="text-white">{selectedBluetoothLog.studentName || 'Unknown student'}</p>
                    <p>{selectedBluetoothLog.studentMatric || 'No matric number available'}</p>
                    <p>{selectedBluetoothLog.studentEmail || 'No email available'}</p>
                    <p>{selectedBluetoothLog.studentDepartment || 'No department available'}</p>
                    <p>Student ID: {selectedBluetoothLog.studentId}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Session</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="text-white">{selectedBluetoothLog.sessionCourseCode || 'Unknown course'}{selectedBluetoothLog.sessionCourseTitle ? ` • ${selectedBluetoothLog.sessionCourseTitle}` : ''}</p>
                    <p>{selectedBluetoothLog.sessionLecturerName || 'Unknown lecturer'}</p>
                    <p>{selectedBluetoothLog.sessionRoom || 'Unknown room'}</p>
                    <p>Session ID: {selectedBluetoothLog.sessionId}</p>
                    <p>{selectedBluetoothLog.sessionIsActive ? 'Session still active' : 'Session closed'}</p>
                    <p>{selectedBluetoothLog.sessionRequiresBluetooth ? 'Bluetooth verification required' : 'Bluetooth verification not required'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-3 md:col-span-2">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Verification</h4>
                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p>Device: <span className="text-white">{selectedBluetoothLog.deviceName || 'Unknown device'}</span></p>
                    <p>Device ID: <span className="text-white">{selectedBluetoothLog.deviceId || 'Not recorded'}</span></p>
                    <p>Verified at: <span className="text-white">{new Date(selectedBluetoothLog.verifiedAt).toLocaleString()}</span></p>
                    <p>Status: <span className={selectedBluetoothLog.success ? 'text-success' : 'text-destructive'}>{selectedBluetoothLog.success ? 'Success' : 'Failure'}</span></p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-muted-foreground">
                    {selectedBluetoothLog.reason ? selectedBluetoothLog.reason : 'No failure reason was recorded for this attempt.'}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card p-6"
      >
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              Attendance History
            </h3>
            <p className="text-sm text-muted-foreground">One timeline for QR scans, QR + Bluetooth sessions, and Bluetooth verification checks.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white">
              {filteredAttendanceHistory.length}/{attendanceHistoryEntries.length || 0} shown
            </span>
            <span className="rounded-full bg-success/15 px-2.5 py-1 text-success">
              {attendanceHistoryEntries.filter((entry) => entry.success).length} successful
            </span>
            <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-destructive">
              {attendanceHistoryEntries.filter((entry) => !entry.success).length} flagged
            </span>
          </div>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={attendanceHistorySearch}
              onChange={(event) => setAttendanceHistorySearch(event.target.value)}
              placeholder="Search student, course, session, device, or note"
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={attendanceHistoryMode}
              onChange={(event) => setAttendanceHistoryMode(event.target.value as 'all' | AttendanceHistoryMode)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-3 text-sm text-white outline-none transition-colors focus:border-primary"
            >
              <option value="all">All modes</option>
              <option value="qr">QR only</option>
              <option value="bluetooth-qr">QR + Bluetooth</option>
              <option value="bluetooth-proximity">Bluetooth checks</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredAttendanceHistory.length > 0 ? (
            filteredAttendanceHistory.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${entry.success ? 'bg-success/20' : 'bg-destructive/20'}`}>
                      {entry.success ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">{entry.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Badge variant="secondary" className="border-white/10 bg-slate-900/60 text-muted-foreground">
                      {entry.kind === 'attendance' ? 'Attendance record' : 'Verification log'}
                    </Badge>
                    <Badge className={entry.success ? 'border-success/30 bg-success/15 text-success' : 'border-destructive/30 bg-destructive/15 text-destructive'}>
                      {entry.mode}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Student</p>
                    <p className="mt-1 text-white">{entry.studentLabel}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Session</p>
                    <p className="mt-1 text-white">{entry.sessionLabel}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Time</p>
                    <p className="mt-1 text-white">{new Date(entry.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {(entry.deviceLabel || entry.reason) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {entry.deviceLabel && <span className="rounded-full bg-white/5 px-2.5 py-1 text-white">Device: {entry.deviceLabel}</span>}
                    {entry.reason && <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">{entry.reason}</span>}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-800/30 p-8 text-center text-sm text-muted-foreground">
              No history entries match the current search.
            </div>
          )}
        </div>
      </motion.div>

      {/* System Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-warning" />
          System Activity Logs
        </h3>
        <div className="space-y-3">
          {systemLogs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/50"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                log.action.includes('Started') ? 'bg-primary/20' :
                log.action.includes('Marked') ? 'bg-success/20' :
                log.action.includes('Ended') ? 'bg-destructive/20' :
                'bg-warning/20'
              }`}>
                {log.action.includes('Started') && <Play className="w-4 h-4 text-primary" />}
                {log.action.includes('Marked') && <CheckCircle className="w-4 h-4 text-success" />}
                {log.action.includes('Ended') && <AlertCircle className="w-4 h-4 text-destructive" />}
                {log.action.includes('Login') && <UserCircle className="w-4 h-4 text-warning" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{log.action}</p>
                <p className="text-xs text-muted-foreground">{log.details}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white">{log.user}</p>
                <p className="text-xs text-muted-foreground">{log.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
