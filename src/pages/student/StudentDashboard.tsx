import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  ScanLine, 
  BookOpen,
  CheckCircle,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { useStudent } from '@/hooks/useAuthHooks';
import { useAttendance } from '@/hooks/useAttendance';
import { useToast } from '@/hooks/useToast';
import { StatCard } from '@/components/ui/StatCard';
import { CourseCard } from '@/components/ui/CourseCard';
import { QRScanner } from '@/components/ui/QRScanner';
import { getStudentCourses, subscribeToTableChanges } from '@/services/universityService';
import type { Course } from '@/types';
import type { ScanResult } from '@/types';

export function StudentDashboard() {
  const student = useStudent();
  const { scanBarcode, getActiveSessionForCourse, attendanceRecords } = useAttendance();
  const { success, error } = useToast();
  
  const [showScanner, setShowScanner] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!student) return;

    let isMounted = true;

    const refreshCourses = () => {
      void getStudentCourses(student.id).then((nextCourses) => {
        if (isMounted) {
          setCourses(nextCourses);
        }
      });
    };

    refreshCourses();
    const cleanup = subscribeToTableChanges(['course_enrollments', 'courses', 'course_schedules'], refreshCourses);

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [student]);

  if (!student) return null;

  const studentAttendanceRecords = attendanceRecords.filter((record) => record.studentId === student.id);
  
  // Calculate stats
  const totalClasses = studentAttendanceRecords.length;
  const presentCount = studentAttendanceRecords.filter(r => r.status === 'present').length;
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
  const classesToday = courses.filter(c => c.schedule.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })).length;

  const selectedActiveSession = selectedCourseId ? getActiveSessionForCourse(selectedCourseId) : undefined;

  const handleScan = async (
    data: string,
    bluetoothContext?: {
      bluetoothVerified?: boolean;
      bluetoothDeviceName?: string;
      bluetoothDeviceId?: string;
    }
  ): Promise<ScanResult> => {
    const result = await scanBarcode(data, student.id, bluetoothContext);
    
    if (result.success) {
      success(result.message);
    } else {
      error(result.message);
    }
    
    return result;
  };

  const recentActivity = studentAttendanceRecords
    .slice(-5)
    .reverse()
    .map(record => ({
      id: record.id,
      course: record.courseCode,
      title: record.courseTitle,
      date: record.date,
      time: record.time,
      status: record.status
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, {student.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm text-white">Student Portal</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          subtitle="Overall attendance performance"
          icon={TrendingUp}
          color="success"
          trend="up"
          trendValue="+5%"
          delay={0}
        />
        <StatCard
          title="Classes Today"
          value={classesToday}
          subtitle="Scheduled classes for today"
          icon={BookOpen}
          color="primary"
          delay={0.1}
        />
        <StatCard
          title="Total Scans"
          value={presentCount}
          subtitle="Successful attendance scans"
          icon={QrCode}
          color="secondary"
          delay={0.2}
        />
        <StatCard
          title="Current Streak"
          value="12 days"
          subtitle="Consecutive attendance"
          icon={CheckCircle}
          color="warning"
          trend="up"
          trendValue="Best"
          delay={0.3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              My Courses
            </h2>
            <span className="text-sm text-muted-foreground">{courses.length} courses enrolled</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => {
                  setSelectedCourseId(course.id);
                  setShowScanner(true);
                }}
                actionLabel="Scan Attendance"
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Scan Button */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Quick Scan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Scan your lecturer's attendance code
            </p>
            <button
              onClick={() => {
                setSelectedCourseId(null);
                setShowScanner(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <ScanLine className="w-5 h-5" />
              Open Scanner
            </button>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              Recent Activity
            </h3>
            
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'present' ? 'bg-success/20' : 'bg-destructive/20'
                    }`}>
                      {activity.status === 'present' ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{activity.course}</p>
                      <p className="text-xs text-muted-foreground">{activity.date}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </motion.div>

          {/* Attendance Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              Tips
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Arrive early to ensure successful scanning
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Keep your camera lens clean for better scans
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Codes expire after 15 minutes
              </li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          bluetoothSession={selectedActiveSession?.requiresBluetooth ? {
            requiresBluetooth: true,
            bluetoothDeviceName: selectedActiveSession.bluetoothDeviceName,
            bluetoothServiceUuid: selectedActiveSession.bluetoothServiceUuid,
            courseTitle: selectedActiveSession.courseTitle,
          } : null}
          onScan={handleScan}
          onClose={() => {
            setShowScanner(false);
            setSelectedCourseId(null);
          }}
        />
      )}
    </div>
  );
}
