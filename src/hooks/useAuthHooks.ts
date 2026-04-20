import { useContext } from 'react';
import type { Admin, Lecturer, Student, UserRole } from '@/types';
import { AuthContext } from '@/hooks/auth-context';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useHasRole(role: UserRole): boolean {
  const { user } = useAuth();
  return user?.role === role;
}

export function useStudent(): Student | null {
  const { user } = useAuth();
  return user?.role === 'student' ? (user as Student) : null;
}

export function useLecturer(): Lecturer | null {
  const { user } = useAuth();
  return user?.role === 'lecturer' ? (user as Lecturer) : null;
}

export function useAdmin(): Admin | null {
  const { user } = useAuth();
  return user?.role === 'admin' ? (user as Admin) : null;
}