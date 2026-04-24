import { createContext } from 'react';
import type { User, UserRole } from '@/types';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  department: string;
  matricNumber?: string;
  level?: number;
  staffId?: string;
  position?: string;
}

export interface RegisterOutcome {
  success: boolean;
  needsEmailConfirmation: boolean;
  message: string | null;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, _password: string, role: UserRole) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<RegisterOutcome>;
  logout: () => void;
  updateUserProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'department' | 'avatar'>>) => Promise<User | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
  authError: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);