import { useEffect, useMemo, useState } from 'react';
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
  Search,
  Filter,
  Download,
  BarChart3,
  GraduationCap,
  UserCircle,
  Play
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAuthHooks';
import { useAttendance } from '@/hooks/useAttendance';
import { StatCard } from '@/components/ui/StatCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { getDepartmentDistribution, getUserCounts, subscribeToTableChanges } from '@/services/universityService';

export function AdminDashboard() {
  const admin = useAdmin();
  const { activeSessions, attendanceRecords } = useAttendance();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [userCounts, setUserCounts] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalLecturers: 0,
    totalAdmins: 0,
  });
  const [departmentData, setDepartmentData] = useState<Array<{ name: string; value: number; color: string }>>([]);

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

    refreshCounts();
    refreshDepartments();
    const cleanup = subscribeToTableChanges(['profiles'], () => {
      refreshCounts();
      refreshDepartments();
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, []);

  const weeklyData = useMemo(() => {
    const days = Array.from({ length: 5 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (4 - index));
      return {
        key: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      };
    });

    return days.map(({ key, day }) => {
      const attendance = attendanceRecords.filter((record) => record.date === key).length;
      const expected = activeSessions
        .filter((session) => session.createdAt.split('T')[0] === key)
        .reduce((total, session) => total + session.totalStudents, 0);

      return {
        day,
        attendance,
        expected: expected > 0 ? expected : attendance,
      };
    });
  }, [activeSessions, attendanceRecords]);

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
      session.lecturerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.room.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
          <Button variant="outline" size="sm" className="border-white/10">
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
              Weekly Attendance Trend
            </h3>
            <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm text-white">
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
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
              <Button variant="outline" size="icon" className="border-white/10">
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
