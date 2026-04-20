import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Lock,
  Mail,
  Monitor,
  Palette,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCircle2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAttendance } from '@/hooks/useAttendance';
import { useAdmin, useAuth, useLecturer, useStudent } from '@/hooks/useAuthHooks';
import { useToast } from '@/hooks/useToast';
import { getLecturerCourses, getStudentCourses, getUserCounts, subscribeToTableChanges } from '@/services/universityService';
import type { UserRole } from '@/types';

type AccentName = 'blue' | 'teal' | 'amber';
const SETTINGS_STORAGE_PREFIX = 'attendance-management-settings';

type SettingsState = {
  displayName: string;
  email: string;
  accent: AccentName;
  emailAlerts: boolean;
  sessionReminders: boolean;
  weeklySummary: boolean;
  cameraGuidance: boolean;
};

function readStoredSettings(userId: string, fallback: SettingsState): SettingsState {
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = window.localStorage.getItem(`${SETTINGS_STORAGE_PREFIX}:${userId}`);
    if (!stored) return fallback;

    return { ...fallback, ...(JSON.parse(stored) as Partial<SettingsState>) };
  } catch {
    return fallback;
  }
}

function PreferenceToggle({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-800/60 p-4 text-left transition-colors hover:border-primary/30 hover:bg-slate-800"
    >
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-slate-700'}`}>
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-semibold text-white">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function Settings() {
  const { user, updateUserProfile } = useAuth();
  const student = useStudent();
  const lecturer = useLecturer();
  const admin = useAdmin();
  const { activeSessions, attendanceRecords } = useAttendance();
  const { success, error } = useToast();
  const [studentCourseCount, setStudentCourseCount] = useState(0);
  const [lecturerCourseCount, setLecturerCourseCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const defaultSettings: SettingsState = {
    displayName: user?.name ?? '',
    email: user?.email ?? '',
    accent: 'blue',
    emailAlerts: true,
    sessionReminders: true,
    weeklySummary: false,
    cameraGuidance: true,
  };

  const storedSettings = user ? readStoredSettings(user.id, defaultSettings) : defaultSettings;

  const [displayName, setDisplayName] = useState(storedSettings.displayName);
  const [email, setEmail] = useState(storedSettings.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accent, setAccent] = useState<AccentName>(storedSettings.accent);
  const [emailAlerts, setEmailAlerts] = useState(storedSettings.emailAlerts);
  const [sessionReminders, setSessionReminders] = useState(storedSettings.sessionReminders);
  const [weeklySummary, setWeeklySummary] = useState(storedSettings.weeklySummary);
  const [cameraGuidance, setCameraGuidance] = useState(storedSettings.cameraGuidance);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const refreshStudentCourses = () => {
      if (!student) return;

      void getStudentCourses(student.id).then((courses) => {
        if (isMounted) {
          setStudentCourseCount(courses.length);
        }
      });
    };

    const refreshLecturerCourses = () => {
      if (!lecturer) return;

      void getLecturerCourses(lecturer.id).then((courses) => {
        if (isMounted) {
          setLecturerCourseCount(courses.length);
        }
      });
    };

    const refreshUserCounts = () => {
      if (!admin) return;

      void getUserCounts().then((counts) => {
        if (isMounted) {
          setTotalUsers(counts.totalUsers);
        }
      });
    };

    if (student) {
      refreshStudentCourses();
    }

    if (lecturer) {
      refreshLecturerCourses();
    }

    if (admin) {
      refreshUserCounts();
    }

    const cleanup = subscribeToTableChanges(['profiles', 'courses', 'course_enrollments', 'course_schedules'], () => {
      refreshStudentCourses();
      refreshLecturerCourses();
      refreshUserCounts();
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [admin, lecturer, student, user]);

  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter((record) => record.date === today);

  const roleAccentStyles: Record<AccentName, string> = {
    blue: 'from-blue-500/20 to-cyan-500/20 text-blue-300',
    teal: 'from-emerald-500/20 to-teal-500/20 text-emerald-300',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-300',
  };

  const roleBadgeStyles: Record<UserRole, string> = {
    student: 'bg-blue-500/15 text-blue-300 border-blue-400/20',
    lecturer: 'bg-violet-500/15 text-violet-300 border-violet-400/20',
    admin: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  };

  const accentOptions: Array<{ key: AccentName; label: string }> = [
    { key: 'blue', label: 'Ocean' },
    { key: 'teal', label: 'Mint' },
    { key: 'amber', label: 'Sunset' },
  ];

  const hasChanges =
    displayName !== storedSettings.displayName ||
    email !== storedSettings.email ||
    accent !== storedSettings.accent ||
    emailAlerts !== storedSettings.emailAlerts ||
    sessionReminders !== storedSettings.sessionReminders ||
    weeklySummary !== storedSettings.weeklySummary ||
    cameraGuidance !== storedSettings.cameraGuidance ||
    !!currentPassword ||
    !!newPassword ||
    !!confirmPassword;

  const handleSave = async () => {
    if (newPassword || confirmPassword) {
      if (!currentPassword || newPassword !== confirmPassword) {
        error('Passwords do not match.');
        return;
      }
    }

    if (user) {
      await updateUserProfile({ name: displayName, email });

      window.localStorage.setItem(
        `${SETTINGS_STORAGE_PREFIX}:${user.id}`,
        JSON.stringify({
          displayName,
          email,
          accent,
          emailAlerts,
          sessionReminders,
          weeklySummary,
          cameraGuidance,
        })
      );
    }

    success('Settings saved successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleReset = () => {
    setDisplayName(user.name);
    setEmail(user.email);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setAccent('blue');
    setEmailAlerts(true);
    setSessionReminders(true);
    setWeeklySummary(false);
    setCameraGuidance(true);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`${SETTINGS_STORAGE_PREFIX}:${user.id}`);
    }
  };

  const getRoleSummary = () => {
    if (student) {
      return [
        {
          icon: GraduationCap,
          label: 'Matric Number',
          value: student.matricNumber,
          hint: `Level ${student.level} student in ${student.department}`,
        },
        {
          icon: BookOpen,
          label: 'Enrolled Courses',
          value: `${studentCourseCount} courses`,
          hint: 'Courses linked to your profile',
        },
        {
          icon: Activity,
          label: 'Attendance Rate',
          value: `${student.attendanceRate}%`,
          hint: `${attendanceRecords.filter((record) => record.studentId === student.id).length} recorded scans`,
        },
      ];
    }

    if (lecturer) {
      return [
        {
          icon: ShieldCheck,
          label: 'Staff ID',
          value: lecturer.staffId,
          hint: `Lecturer in ${lecturer.department}`,
        },
        {
          icon: BookOpen,
          label: 'Assigned Courses',
          value: `${lecturerCourseCount} courses`,
          hint: 'Courses available for code generation',
        },
        {
          icon: Users,
          label: 'Live Sessions',
          value: `${activeSessions.filter((session) => session.lecturerId === lecturer.id && session.isActive).length}`,
          hint: 'Sessions currently running under your account',
        },
      ];
    }

    return [
      {
        icon: ShieldCheck,
        label: 'Staff ID',
        value: admin?.staffId ?? 'N/A',
        hint: admin?.position ?? 'Administrative account',
      },
      {
        icon: Users,
        label: 'Total Users',
        value: `${totalUsers}`,
        hint: 'Students and lecturers tracked in the system',
      },
      {
        icon: Activity,
        label: 'Today\'s Records',
        value: `${todayRecords.length}`,
        hint: 'Attendance records logged today',
      },
    ];
  };

  const roleSummary = getRoleSummary();

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Account Preferences
          </p>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Tune your profile, security, and attendance notifications from one place.
          </p>
        </div>

        <Badge className={`w-fit border ${roleBadgeStyles[user.role]}`}>
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)} account
        </Badge>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Profile Details</h2>
              <p className="text-sm text-muted-foreground">These details are used across the dashboard.</p>
            </div>
            <div className={`rounded-full bg-gradient-to-r px-4 py-2 text-sm font-medium ${roleAccentStyles[accent]}`}>
              Active accent: {accentOptions.find((option) => option.key === accent)?.label}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5 rounded-3xl border border-white/10 bg-slate-800/50 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white">
                  {displayName
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">{user.department}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-white/5 text-muted-foreground">
                      {user.email}
                    </Badge>
                    <Badge className={roleBadgeStyles[user.role]}>{user.role}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Display name</label>
                  <Input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="border-slate-700 bg-slate-900/70 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Email address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="border-slate-700 bg-slate-900/70 pl-10 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Department</label>
                <Input value={user.department} disabled className="border-slate-700 bg-slate-900/40 text-white disabled:opacity-80" />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard
                  icon={CalendarDays}
                  label="Profile status"
                  value="Active"
                  hint="Connected to the attendance workspace"
                />
                <InfoCard
                  icon={Monitor}
                  label="Default device"
                  value="Desktop"
                  hint="Optimized for dashboard use and code generation"
                />
                <InfoCard
                  icon={Smartphone}
                  label="Mobile access"
                  value="Enabled"
                  hint="Scanner and notifications are available on phones"
                />
              </div>
            </div>

            <div className="space-y-5 rounded-3xl border border-white/10 bg-slate-800/50 p-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Security</h3>
                <p className="text-sm text-muted-foreground">Rotate your password and keep the account active only on trusted devices.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Current password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="border-slate-700 bg-slate-900/70 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">New password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="border-slate-700 bg-slate-900/70 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Confirm password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="border-slate-700 bg-slate-900/70 text-white"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-primary/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Security posture</p>
                    <p className="text-sm text-muted-foreground">Use strong credentials and end sessions from the sidebar when finished.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleReset} variant="outline" className="border-white/10">
                  Reset
                </Button>
                <Button onClick={handleSave} className="btn-glow bg-gradient-to-r from-primary to-secondary" disabled={!hasChanges}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <section className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-white">Appearance</h2>
            </div>
            <div className="space-y-3">
              {accentOptions.map((option) => {
                const isActive = accent === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAccent(option.key)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
                      isActive
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-white/10 bg-slate-800/50 hover:border-primary/20 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-white">{option.label}</p>
                      <p className="text-sm text-muted-foreground">A subtle dashboard accent palette</p>
                    </div>
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${roleAccentStyles[option.key]}`} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-secondary" />
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
            </div>
            <div className="space-y-3">
              <PreferenceToggle
                title="Email alerts"
                description="Receive attendance updates and important account notices."
                enabled={emailAlerts}
                onToggle={() => setEmailAlerts((value) => !value)}
              />
              <PreferenceToggle
                title="Session reminders"
                description="Get reminded when attendance codes are live."
                enabled={sessionReminders}
                onToggle={() => setSessionReminders((value) => !value)}
              />
              <PreferenceToggle
                title="Weekly summary"
                description="Review attendance trends at the end of each week."
                enabled={weeklySummary}
                onToggle={() => setWeeklySummary((value) => !value)}
              />
              <PreferenceToggle
                title="Camera guidance"
                description="Show scanner hints when using the QR reader."
                enabled={cameraGuidance}
                onToggle={() => setCameraGuidance((value) => !value)}
              />
            </div>
          </section>

          <section className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-semibold text-white">Role Snapshot</h2>
            </div>
            <div className="space-y-3">
              {roleSummary.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="font-semibold text-white">{item.value}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </motion.aside>
      </div>
    </div>
  );
}