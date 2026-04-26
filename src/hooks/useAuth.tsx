import { useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { authenticateUser, changeUserPassword, registerUser, restoreAuthenticatedUser, signOutUser, updateProfileInDatabase } from '@/services/universityService';
import { AuthContext, type RegisterInput, type RegisterOutcome } from '@/hooks/auth-context';

const AUTH_STORAGE_KEY = 'attendance-management-auth-user';

function readStoredUser(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (isSupabaseConfigured ? null : readStoredUser()));
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || isSupabaseConfigured) return;

    if (user) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;

    restoreAuthenticatedUser().then((restoredUser) => {
      if (isMounted) {
        setUser(restoredUser);
      }
    });

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        setUser(null);
        return;
      }

      const restoredUser = await restoreAuthenticatedUser();
      setUser(restoredUser);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, _password: string, role: UserRole): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    const { user: authenticatedUser, message } = await authenticateUser(email, _password, role);

    if (authenticatedUser) {
      setUser(authenticatedUser);
      setIsLoading(false);
      return true;
    }

    setAuthError(message);

    setIsLoading(false);
    return false;
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<RegisterOutcome> => {
    setIsLoading(true);
    setAuthError(null);

    const result = await registerUser(input);

    if (result.errorCode) {
      setAuthError(result.message ?? 'Unable to create account.');
      setIsLoading(false);
      return {
        success: false,
        needsEmailConfirmation: false,
        message: result.message,
      };
    }

    if (result.user && !result.needsEmailConfirmation) {
      setUser(result.user);
    }

    setIsLoading(false);
    return {
      success: true,
      needsEmailConfirmation: result.needsEmailConfirmation,
      message: result.message,
    };
  }, []);

  const logout = useCallback(() => {
    void signOutUser();
    setUser(null);
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<Pick<User, 'name' | 'email' | 'department' | 'avatar'>>) => {
    if (!user) return null;

    const updatedUser = await updateProfileInDatabase(user, updates);

    if (updatedUser) {
      setUser(updatedUser);
    }

    return updatedUser;
  }, [user]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) {
      return {
        success: false,
        message: 'You must be signed in to change your password.',
      };
    }

    return changeUserPassword(currentPassword, newPassword);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUserProfile,
      changePassword,
      isLoading,
      authError
    }}>
      {children}
    </AuthContext.Provider>
  );
}
