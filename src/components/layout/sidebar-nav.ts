import { LayoutDashboard, QrCode, ScanLine, Users, BookOpen, Settings, BarChart3 } from 'lucide-react';
import type { UserRole } from '@/types';

export interface SidebarNavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
}

export const navItems: SidebarNavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['student', 'lecturer', 'admin'] },
  { label: 'My Courses', icon: BookOpen, path: '/courses', roles: ['student'] },
  { label: 'Scan Attendance', icon: ScanLine, path: '/scan', roles: ['student'] },
  { label: 'My Classes', icon: BookOpen, path: '/classes', roles: ['lecturer'] },
  { label: 'Generate Code', icon: QrCode, path: '/generate', roles: ['lecturer'] },
  { label: 'All Users', icon: Users, path: '/users', roles: ['admin'] },
  { label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['student', 'lecturer', 'admin'] },
];