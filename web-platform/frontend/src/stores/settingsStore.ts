import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UnitPreference = 'kg' | 'bag';

interface SettingsState {
  defaultUnit: UnitPreference;
  setDefaultUnit: (unit: UnitPreference) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultUnit: 'bag',
      setDefaultUnit: (unit) => set({ defaultUnit: unit }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
