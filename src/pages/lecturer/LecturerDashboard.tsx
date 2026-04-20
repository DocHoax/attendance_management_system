import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  QrCode, 
  BookOpen,
  Clock,
  Play,
  History,
  MapPin,
  ChevronRight,
  Bluetooth,
} from 'lucide-react';
import { useLecturer } from '@/hooks/useAuthHooks';
import { useAttendance } from '@/hooks/useAttendance';
import { useToast } from '@/hooks/useToast';
import { StatCard } from '@/components/ui/StatCard';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { getLecturerCourses, subscribeToTableChanges } from '@/services/universityService';
import type { Course } from '@/types';
import type { ActiveSession } from '@/types';

export function LecturerDashboard() {
  const lecturer = useLecturer();
  const { generateSession, endSession, getActiveSessionForCourse, activeSessions, attendanceRecords } = useAttendance();
  const { success } = useToast();
  
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState<string>('15');
  const [requiresBluetooth, setRequiresBluetooth] = useState(false);
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState('AttendX Beacon');
  const [currentSession, setCurrentSession] = useState<ActiveSession | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);

  useEffect(() => {
    if (!lecturer) return;

    let isMounted = true;

    const refreshCourses = () => {
      void getLecturerCourses(lecturer.id).then((nextCourses) => {
        if (isMounted) {
          setCourses(nextCourses);
        }
      });
    };

    refreshCourses();
    const cleanup = subscribeToTableChanges(['courses', 'course_schedules'], refreshCourses);

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [lecturer]);

  const lecturerCourseIds = useMemo(() => new Set(courses.map((course) => course.id)), [courses]);
  const attendanceHistory = useMemo(() => {
    return attendanceRecords
      .filter((record) => lecturerCourseIds.has(record.courseId))
      .slice()
      .sort((left, right) => {
        const leftTimestamp = new Date(`${left.date}T${left.time}:00`).getTime();
        const rightTimestamp = new Date(`${right.date}T${right.time}:00`).getTime();
        return rightTimestamp - leftTimestamp;
      })
      .slice(0, 12);
  }, [attendanceRecords, lecturerCourseIds]);

  if (!lecturer) return null;
  
  // Calculate stats
  const totalStudents = courses.reduce((acc, course) => acc + course.totalStudents, 0);
  const allAttendance = attendanceRecords.filter((record) => courses.some((course) => course.id === record.courseId));
  const todayAttendance = allAttendance.filter(r => r.date === new Date().toISOString().split('T')[0]);
  const todayAttendanceRate = todayAttendance.length > 0 
    ? Math.round((todayAttendance.filter(r => r.status === 'present').length / todayAttendance.length) * 100)
    : 0;
  
  const activeSessionsCount = activeSessions.filter(s => 
    s.lecturerId === lecturer.id && s.isActive
  ).length;

  const handleGenerateCode = () => {
    if (!selectedCourse) return;
    
    const course = courses.find(c => c.id === selectedCourse);
    if (!course) return;

    // Check if there's already an active session for this course
    const existingSession = getActiveSessionForCourse(course.id);
    if (existingSession) {
      setCurrentSession(existingSession);
      setShowQRCode(true);
      setShowGenerateDialog(false);
      return;
    }

    const session = generateSession(
      course.id,
      course.code,
      course.title,
      lecturer.id,
      lecturer.name,
      course.schedule.room,
      course.totalStudents,
      parseInt(sessionDuration),
      {
        requiresBluetooth,
        bluetoothDeviceName: requiresBluetooth ? bluetoothDeviceName.trim() || 'AttendX Beacon' : undefined,
      }
    );
    
    setCurrentSession(session);
    setShowQRCode(true);
    setShowGenerateDialog(false);
    success(`Attendance session started for ${course.code}`);
  };

  const handleEndSession = () => {
    if (currentSession) {
      endSession(currentSession.id);
      setShowQRCode(false);
      setCurrentSession(null);
      success('Attendance session ended');
    }
  };

  const getScannedCount = () => {
    if (!currentSession) return 0;
    const session = activeSessions.find(s => s.id === currentSession.id);
    return session?.scannedStudents.length || 0;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome, Dr. {lecturer.name.split(' ').pop()}!</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-sm text-white">Lecturer Portal</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={totalStudents}
          subtitle="Across all courses"
          icon={Users}
          color="primary"
          delay={0}
        />
        <StatCard
          title="Today's Attendance"
          value={`${todayAttendanceRate}%`}
          subtitle="Average across courses"
          icon={TrendingUp}
          color="success"
          trend="up"
          trendValue="+8%"
          delay={0.1}
        />
        <StatCard
          title="Active Sessions"
          value={activeSessionsCount}
          subtitle="Currently running"
          icon={Play}
          color="warning"
          delay={0.2}
        />
        <StatCard
          title="Total Courses"
          value={courses.length}
          subtitle="Assigned this semester"
          icon={BookOpen}
          color="secondary"
          delay={0.3}
        />
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={() => setShowGenerateDialog(true)}
            className="btn-glow bg-gradient-to-r from-primary to-secondary"
            size="lg"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Generate Attendance Code
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-white/10 hover:bg-white/5"
            onClick={() => setShowAttendanceHistory(true)}
          >
            <History className="w-5 h-5 mr-2" />
            View Attendance History
          </Button>
        </div>
      </motion.div>

      {/* My Classes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            My Classes
          </h2>
          <span className="text-sm text-muted-foreground">{courses.length} courses assigned</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course, index) => {
            const activeSession = getActiveSessionForCourse(course.id);
            
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="glass-card-hover p-5 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: course.color }}
                  >
                    {course.code.split(' ')[1]}
                  </div>
                  {activeSession && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/20 text-success text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      Active
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-1">{course.code}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{course.title}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{course.schedule.day}, {course.schedule.startTime} - {course.schedule.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{course.schedule.room}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{course.totalStudents} students enrolled</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {activeSession ? (
                    <Button
                      onClick={() => {
                        setCurrentSession(activeSession);
                        setShowQRCode(true);
                      }}
                      variant="outline"
                      className="flex-1 border-success/50 text-success hover:bg-success/10"
                      size="sm"
                    >
                      View Session
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedCourse(course.id);
                        setShowGenerateDialog(true);
                      }}
                      className="flex-1"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start Session
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Dialog open={showAttendanceHistory} onOpenChange={setShowAttendanceHistory}>
        <DialogContent className="max-h-[85vh] overflow-hidden border-white/10 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Attendance History</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Recent attendance activity across your assigned courses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
                <p className="text-xs text-muted-foreground">Records</p>
                <p className="text-2xl font-bold text-white">{attendanceHistory.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
                <p className="text-xs text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-success">
                  {attendanceHistory.filter((record) => record.status === 'present').length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
                <p className="text-xs text-muted-foreground">Late</p>
                <p className="text-2xl font-bold text-warning">
                  {attendanceHistory.filter((record) => record.status === 'late').length}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {attendanceHistory.length > 0 ? (
                attendanceHistory.map((record) => (
                  <div key={record.id} className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{record.courseCode}</p>
                        <p className="text-sm text-muted-foreground">{record.courseTitle}</p>
                      </div>
                      <Badge
                        className={
                          record.status === 'present'
                            ? 'bg-success/20 text-success border-success/30'
                            : record.status === 'late'
                              ? 'bg-warning/20 text-warning border-warning/30'
                              : 'bg-destructive/20 text-destructive border-destructive/30'
                        }
                      >
                        {record.status}
                      </Badge>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                      <p>{record.studentName}</p>
                      <p>{record.date}</p>
                      <p>{record.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-800/30 p-8 text-center text-sm text-muted-foreground">
                  No attendance records available yet for your courses.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Code Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Generate Attendance Code</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a course and session duration to generate a QR code for attendance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Select Course
              </label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {courses.map(course => (
                    <SelectItem 
                      key={course.id} 
                      value={course.id}
                      className="text-white hover:bg-slate-700"
                    >
                      {course.code} - {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Session Duration
              </label>
              <Select value={sessionDuration} onValueChange={setSessionDuration}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="5" className="text-white hover:bg-slate-700">5 minutes</SelectItem>
                  <SelectItem value="10" className="text-white hover:bg-slate-700">10 minutes</SelectItem>
                  <SelectItem value="15" className="text-white hover:bg-slate-700">15 minutes</SelectItem>
                  <SelectItem value="20" className="text-white hover:bg-slate-700">20 minutes</SelectItem>
                  <SelectItem value="30" className="text-white hover:bg-slate-700">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-white">
                    <Bluetooth className="h-4 w-4 text-primary" />
                    Require Bluetooth proximity
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Students must verify a nearby Bluetooth device before attendance is accepted.
                  </p>
                </div>
                <Switch checked={requiresBluetooth} onCheckedChange={setRequiresBluetooth} />
              </div>

              {requiresBluetooth && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Bluetooth device label
                  </label>
                  <input
                    value={bluetoothDeviceName}
                    onChange={(event) => setBluetoothDeviceName(event.target.value)}
                    placeholder="AttendX Beacon"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowGenerateDialog(false)}
              className="flex-1 border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateCode}
              disabled={!selectedCourse}
              className="flex-1 btn-glow bg-gradient-to-r from-primary to-secondary"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Generate Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Display */}
      <AnimatePresence>
        {showQRCode && currentSession && (
          <QRCodeDisplay
            session={currentSession}
            onClose={handleEndSession}
            scannedCount={getScannedCount()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
