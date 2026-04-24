import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuthHooks';
import { AttendanceProvider } from '@/hooks/useAttendance';
import { ToastProvider } from '@/hooks/useToast';
import { Sidebar, SidebarContent } from '@/components/layout/Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Login } from '@/pages/Login';
import { SignUp } from '@/pages/SignUp';
import { Settings } from '@/pages/Settings';
import { StudentDashboard } from '@/pages/student/StudentDashboard';
import { LecturerDashboard } from '@/pages/lecturer/LecturerDashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { Menu, QrCode } from 'lucide-react';
import type { UserRole } from '@/types';

// Protected Route Component
function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: UserRole[];
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user?.role || 'student')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Layout Component with Sidebar
function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950">
      <Sidebar />
      <div className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AttendX Pro</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role} portal</p>
            </div>
          </div>

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-sm border-white/10 bg-slate-950 p-0 text-white">
              <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="min-h-screen lg:ml-64">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Role-based Dashboard Router
function DashboardRouter() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'lecturer':
      return <LecturerDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      
      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student', 'lecturer', 'admin']}>
            <DashboardLayout>
              <DashboardRouter />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Student Routes */}
      <Route
        path="/courses"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardLayout>
              <StudentDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardLayout>
              <StudentDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Lecturer Routes */}
      <Route
        path="/classes"
        element={
          <ProtectedRoute allowedRoles={['lecturer']}>
            <DashboardLayout>
              <LecturerDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/generate"
        element={
          <ProtectedRoute allowedRoles={['lecturer']}>
            <DashboardLayout>
              <LecturerDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Admin Routes */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <AdminDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <AdminDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Settings Route (All Roles) */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['student', 'lecturer', 'admin']}>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AttendanceProvider>
            <AppRoutes />
            <ToastContainer />
          </AttendanceProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
