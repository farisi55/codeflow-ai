'use client';

import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
} from 'zustand/middleware';

export type BottomPanelTab = 'terminal' | 'preview';

interface SettingsState {
  autoApply: boolean;
  bottomPanelTab: BottomPanelTab;
  openCodeEnabled: boolean;
  projectPath: string;
  terminalOpen: boolean;
  toggleAutoApply: () => void;
  toggleOpenCode: () => void;
  toggleTerminal: () => void;
  setAutoApply: (value: boolean) => void;
  setBottomPanelTab: (value: BottomPanelTab) => void;
  setProjectPath: (value: string) => void;
  setTerminalOpen: (value: boolean) => void;
  openBottomPanel: (tab: BottomPanelTab) => void;
  toggleBottomPanel: (tab: BottomPanelTab) => void;
}

type PersistedSettingsState = Partial<
  Pick<
    SettingsState,
    | 'autoApply'
    | 'bottomPanelTab'
    | 'openCodeEnabled'
    | 'projectPath'
    | 'terminalOpen'
  >
>;

function isBottomPanelTab(value: unknown): value is BottomPanelTab {
  return value === 'terminal' || value === 'preview';
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoApply: false,
      bottomPanelTab: 'terminal',
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
        set((state) => ({
          bottomPanelTab: 'terminal',
          terminalOpen:
            state.bottomPanelTab === 'terminal'
              ? !state.terminalOpen
              : true,
        }));
      },

      setAutoApply: (value) => {
        set({ autoApply: value });
      },

      setBottomPanelTab: (value) => {
        set({ bottomPanelTab: value });
      },

      setProjectPath: (value) => {
        set({ projectPath: value.trim() });
      },

      setTerminalOpen: (value) => {
        set({ terminalOpen: value });
      },

      openBottomPanel: (tab) => {
        set({ bottomPanelTab: tab, terminalOpen: true });
      },

      toggleBottomPanel: (tab) => {
        set((state) => ({
          bottomPanelTab: tab,
          terminalOpen:
            state.terminalOpen && state.bottomPanelTab === tab
              ? false
              : true,
        }));
      },
    }),
    {
      name: 'codeflow-auto-apply',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        autoApply: state.autoApply,
        bottomPanelTab: state.bottomPanelTab,
        openCodeEnabled: state.openCodeEnabled,
        projectPath: state.projectPath,
        terminalOpen: state.terminalOpen,
      }),
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as PersistedSettingsState | undefined;

        return {
          autoApply:
            typeof state?.autoApply === 'boolean'
              ? state.autoApply
              : false,
          bottomPanelTab: isBottomPanelTab(state?.bottomPanelTab)
            ? state.bottomPanelTab
            : 'terminal',
          openCodeEnabled:
            typeof state?.openCodeEnabled === 'boolean'
              ? state.openCodeEnabled
              : false,
          projectPath:
            typeof state?.projectPath === 'string'
              ? state.projectPath
              : '',
          terminalOpen:
            typeof state?.terminalOpen === 'boolean'
              ? state.terminalOpen
              : false,
        };
      },
      skipHydration: true,
    },
  ),
);
