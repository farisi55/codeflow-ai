import { create } from 'zustand';

export interface OpenFile {
  id: string;
  name: string;
  language: string;
  content: string;
  isDirty: boolean;
  isReadOnly?: boolean;
}

interface EditorState {
  openFiles: OpenFile[];
  activeFileId: string | null;
  isSaving: boolean;
  openFile: (file: OpenFile) => void;
  closeFile: (id: string) => void;
  closeAllFiles: () => void;
  setActiveFile: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  saveActiveFile: () => Promise<void>;
  markClean: (id: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: [],
  activeFileId: null,
  isSaving: false,

  openFile: (file) => {
    set((state) => {
      const exists = state.openFiles.some(
        (openFile) => openFile.id === file.id,
      );
      if (exists) {
        return { activeFileId: file.id };
      }

      return {
        openFiles: [...state.openFiles, file],
        activeFileId: file.id,
      };
    });
  },

  closeFile: (id) => {
    set((state) => {
      const closingIndex = state.openFiles.findIndex(
        (file) => file.id === id,
      );
      if (closingIndex === -1) {
        return state;
      }

      const openFiles = state.openFiles.filter((file) => file.id !== id);
      if (state.activeFileId !== id) {
        return { openFiles };
      }

      return {
        openFiles,
        activeFileId:
          openFiles[closingIndex]?.id ??
          openFiles[closingIndex - 1]?.id ??
          null,
      };
    });
  },

  closeAllFiles: () => {
    set({
      openFiles: [],
      activeFileId: null,
      isSaving: false,
    });
  },

  setActiveFile: (id) => {
    set((state) => ({
      activeFileId: state.openFiles.some((file) => file.id === id)
        ? id
        : state.activeFileId,
    }));
  },

  updateContent: (id, content) => {
    set((state) => ({
      openFiles: state.openFiles.map((file) =>
        file.id === id && !file.isReadOnly
          ? { ...file, content, isDirty: true }
          : file,
      ),
    }));
  },

  markClean: (id) => {
    set((state) => ({
      openFiles: state.openFiles.map((file) =>
        file.id === id ? { ...file, isDirty: false } : file,
      ),
    }));
  },

  saveActiveFile: async () => {
    const { activeFileId, openFiles } = get();
    if (!activeFileId) {
      return;
    }

    const file = openFiles.find(
      (openFile) => openFile.id === activeFileId,
    );
    if (!file || !file.isDirty || file.isReadOnly) {
      return;
    }

    set({ isSaving: true });
    try {
      const { useExplorerStore } = await import(
        '@/stores/explorer.store'
      );
      await useExplorerStore
        .getState()
        .saveFileContent(activeFileId, file.content);
      get().markClean(activeFileId);
    } catch {
      // Explorer store exposes the save error while the tab stays dirty.
    } finally {
      set({ isSaving: false });
    }
  },
}));
