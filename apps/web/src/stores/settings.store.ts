'use client';

import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
} from 'zustand/middleware';

interface SettingsState {
  autoApply: boolean;
  openCodeEnabled: boolean;
  toggleAutoApply: () => void;
  toggleOpenCode: () => void;
  setAutoApply: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoApply: false,
      openCodeEnabled: false,

      toggleAutoApply: () => {
        set((state) => ({ autoApply: !state.autoApply }));
      },

      toggleOpenCode: () => {
        set((state) => ({
          openCodeEnabled: !state.openCodeEnabled,
        }));
      },

      setAutoApply: (value) => {
        set({ autoApply: value });
      },
    }),
    {
      name: 'codeflow-auto-apply',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        autoApply: state.autoApply,
        openCodeEnabled: state.openCodeEnabled,
      }),
      skipHydration: true,
    },
  ),
);
