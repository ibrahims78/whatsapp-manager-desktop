import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: number;
  username: string;
  role: string;
  mustChangePassword: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('wa_token', token);
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('wa_token');
        set({ user: null, token: null });
      },
    }),
    { name: 'wa-auth' }
  )
);
