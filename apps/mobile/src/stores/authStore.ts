import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { UserProfile, UserRole } from '../types';

// expo-secure-store doesn't support web — fall back to localStorage
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  accessToken: string | null;

  // Actions
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setUser: (user: UserProfile) => void;
  loadStoredAuth: () => Promise<void>;

  // Role helpers
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isDriver: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,

  setAuth: async (user, accessToken, refreshToken) => {
    await storage.setItem('access_token', accessToken);
    await storage.setItem('refresh_token', refreshToken);
    await storage.setItem('user_profile', JSON.stringify(user));
    set({ isAuthenticated: true, isLoading: false, user, accessToken });
  },

  clearAuth: async () => {
    await storage.deleteItem('access_token');
    await storage.deleteItem('refresh_token');
    await storage.deleteItem('user_profile');
    set({ isAuthenticated: false, isLoading: false, user: null, accessToken: null });
  },

  setUser: (user) => set({ user }),

  loadStoredAuth: async () => {
    try {
      const accessToken = await storage.getItem('access_token');
      const userJson = await storage.getItem('user_profile');
      if (accessToken && userJson) {
        const user = JSON.parse(userJson) as UserProfile;
        set({ isAuthenticated: true, isLoading: false, user, accessToken });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  hasRole: (...roles) => {
    const user = get().user;
    return user ? roles.includes(user.role) : false;
  },

  isAdmin: () => get().hasRole('admin'),
  isDriver: () => get().hasRole('driver'),
  isManager: () => get().hasRole('location_manager', 'zone_manager'),
  isStaff: () => get().hasRole('staff'),
}));
