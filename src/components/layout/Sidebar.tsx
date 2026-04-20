import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LogOut,
  UserCircle,
  BookOpen,
  QrCode,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuthHooks';
import { navItems } from '@/components/layout/sidebar-nav';

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    onNavigate?.();
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'student':
        return <UserCircle className="w-5 h-5 text-primary" />;
      case 'lecturer':
        return <BookOpen className="w-5 h-5 text-secondary" />;
      case 'admin':
        return <Shield className="w-5 h-5 text-success" />;
      default:
        return <UserCircle className="w-5 h-5" />;
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'student':
        return 'text-primary';
      case 'lecturer':
        return 'text-secondary';
      case 'admin':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AttendX Pro</h1>
            <p className="text-xs text-muted-foreground">Smart Attendance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNavItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-current"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="glass-card p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              {getRoleIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className={`text-xs capitalize ${getRoleColor()}`}>{user?.role}</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-white/10 bg-slate-900/95 backdrop-blur-xl z-50 lg:flex"
    >
      <SidebarContent />
    </motion.aside>
  );
}
