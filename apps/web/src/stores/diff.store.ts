import { create } from 'zustand';

export interface OpenDiffParams {
  fileId: string;
  fileName: string;
  language: string;
  originalContent: string;
  modifiedContent: string;
}

interface DiffState {
  isOpen: boolean;
  renderSideBySide: boolean;
  fileId: string | null;
  fileName: string | null;
  language: string;
  originalContent: string;
  modifiedContent: string;
  openDiff: (params: OpenDiffParams) => void;
  closeDiff: () => void;
  toggleRenderMode: () => void;
  setModifiedContent: (content: string) => void;
}

const INITIAL_STATE = {
  isOpen: false,
  renderSideBySide: true,
  fileId: null,
  fileName: null,
  language: 'plaintext',
  originalContent: '',
  modifiedContent: '',
} satisfies Omit<
  DiffState,
  'openDiff' | 'closeDiff' | 'toggleRenderMode' | 'setModifiedContent'
>;

export const useDiffStore = create<DiffState>((set) => ({
  ...INITIAL_STATE,

  openDiff: (params) => {
    set({
      isOpen: true,
      renderSideBySide: true,
      fileId: params.fileId,
      fileName: params.fileName,
      language: params.language,
      originalContent: params.originalContent,
      modifiedContent: params.modifiedContent,
    });
  },

  closeDiff: () => set({ ...INITIAL_STATE }),

  toggleRenderMode: () => {
    set((state) => ({
      renderSideBySide: !state.renderSideBySide,
    }));
  },

  setModifiedContent: (content) => {
    set({ modifiedContent: content });
  },
}));
