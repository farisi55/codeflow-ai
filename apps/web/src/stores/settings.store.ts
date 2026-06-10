'use client';

import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
} from 'zustand/middleware';

interface SettingsState {
  autoApply: boolean;
  toggleAutoApply: () => void;
  setAutoApply: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoApply: false,

      toggleAutoApply: () => {
        set((state) => ({ autoApply: !state.autoApply }));
      },

      setAutoApply: (value) => {
        set({ autoApply: value });
      },
    }),
    {
      name: 'codeflow-auto-apply',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ autoApply: state.autoApply }),
      skipHydration: true,
    },
  ),
);
