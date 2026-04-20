import { createContext } from 'react';
import type { User, UserRole } from '@/types';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, _password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'department' | 'avatar'>>) => Promise<User | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
  authError: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);