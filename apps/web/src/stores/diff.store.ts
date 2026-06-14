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
  queue: OpenDiffParams[];
  queueIndex: number;
  fileId: string | null;
  fileName: string | null;
  language: string;
  originalContent: string;
  modifiedContent: string;
  openDiff: (params: OpenDiffParams) => void;
  openDiffQueue: (params: OpenDiffParams[]) => void;
  advanceDiff: () => void;
  closeDiff: () => void;
  toggleRenderMode: () => void;
  setModifiedContent: (content: string) => void;
}

const INITIAL_STATE = {
  isOpen: false,
  renderSideBySide: true,
  queue: [],
  queueIndex: 0,
  fileId: null,
  fileName: null,
  language: 'plaintext',
  originalContent: '',
  modifiedContent: '',
} satisfies Omit<
  DiffState,
  | 'openDiff'
  | 'openDiffQueue'
  | 'advanceDiff'
  | 'closeDiff'
  | 'toggleRenderMode'
  | 'setModifiedContent'
>;

export const useDiffStore = create<DiffState>((set) => ({
  ...INITIAL_STATE,

  openDiff: (params) => {
    set({
      isOpen: true,
      renderSideBySide: true,
      queue: [params],
      queueIndex: 0,
      fileId: params.fileId,
      fileName: params.fileName,
      language: params.language,
      originalContent: params.originalContent,
      modifiedContent: params.modifiedContent,
    });
  },

  openDiffQueue: (params) => {
    const first = params[0];
    if (!first) {
      return;
    }

    set({
      isOpen: true,
      renderSideBySide: true,
      queue: params,
      queueIndex: 0,
      fileId: first.fileId,
      fileName: first.fileName,
      language: first.language,
      originalContent: first.originalContent,
      modifiedContent: first.modifiedContent,
    });
  },

  advanceDiff: () => {
    set((state) => {
      const nextIndex = state.queueIndex + 1;
      const next = state.queue[nextIndex];
      if (!next) {
        return { ...INITIAL_STATE };
      }

      return {
        isOpen: true,
        renderSideBySide: state.renderSideBySide,
        queue: state.queue,
        queueIndex: nextIndex,
        fileId: next.fileId,
        fileName: next.fileName,
        language: next.language,
        originalContent: next.originalContent,
        modifiedContent: next.modifiedContent,
      };
    });
  },

  closeDiff: () => set({ ...INITIAL_STATE }),

  toggleRenderMode: () => {
    set((state) => ({
      renderSideBySide: !state.renderSideBySide,
    }));
  },

  setModifiedContent: (content) => {
    set((state) => ({
      modifiedContent: content,
      queue: state.queue.map((item, index) =>
        index === state.queueIndex
          ? { ...item, modifiedContent: content }
          : item,
      ),
    }));
  },
}));
