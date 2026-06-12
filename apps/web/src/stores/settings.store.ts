'use client';

import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
} from 'zustand/middleware';

interface SettingsState {
  autoApply: boolean;
  openCodeEnabled: boolean;
  projectPath: string;
  terminalOpen: boolean;
  toggleAutoApply: () => void;
  toggleOpenCode: () => void;
  toggleTerminal: () => void;
  setAutoApply: (value: boolean) => void;
  setProjectPath: (value: string) => void;
  setTerminalOpen: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoApply: false,
      openCodeEnabled: false,
      projectPath: '',
      terminalOpen: false,

      toggleAutoApply: () => {
        set((state) => ({ autoApply: !state.autoApply }));
      },

      toggleOpenCode: () => {
        set((state) => ({
          openCodeEnabled: !state.openCodeEnabled,
        }));
      },

      toggleTerminal: () => {
        set((state) => ({ terminalOpen: !state.terminalOpen }));
      },

      setAutoApply: (value) => {
        set({ autoApply: value });
      },

      setProjectPath: (value) => {
        set({ projectPath: value.trim() });
      },

      setTerminalOpen: (value) => {
        set({ terminalOpen: value });
      },
    }),
    {
      name: 'codeflow-auto-apply',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        autoApply: state.autoApply,
        openCodeEnabled: state.openCodeEnabled,
        projectPath: state.projectPath,
        terminalOpen: state.terminalOpen,
      }),
      skipHydration: true,
    },
  ),
);
