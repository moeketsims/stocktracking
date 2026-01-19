import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, AuthState } from '../types';

interface AuthStore extends AuthState {
  login: (accessToken: string, refreshToken: string, user: UserProfile) => void;
  logout: () => void;
  updateUser: (user: Partial<UserProfile>) => void;
  isAdmin: () => boolean;
  isZoneManager: () => boolean;
  isLocationManager: () => boolean;
  isDriver: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,

      login: (accessToken, refreshToken, user) => {
        localStorage.setItem('refresh_token', refreshToken);
        set({
          isAuthenticated: true,
          accessToken,
          user,
        });
      },

      logout: () => {
        localStorage.removeItem('refresh_token');
        set({
          isAuthenticated: false,
          accessToken: null,
          user: null,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      isAdmin: () => get().user?.role === 'admin',
      isZoneManager: () => get().user?.role === 'zone_manager',
      isLocationManager: () => get().user?.role === 'location_manager',
      isDriver: () => get().user?.role === 'driver',
      isStaff: () => get().user?.role === 'staff',
      isManager: () => {
        const role = get().user?.role;
        return role === 'admin' || role === 'zone_manager' || role === 'location_manager';
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);
