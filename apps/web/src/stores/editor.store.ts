import { create } from 'zustand';

import type { FileNode } from '@/mock/file-tree';

export interface OpenFile {
  id: string;
  name: string;
  language: string;
  content: string;
  isDirty: boolean;
}

interface EditorState {
  openFiles: OpenFile[];
  activeFileId: string | null;
  openFile: (node: FileNode) => void;
  closeFile: (id: string) => void;
  setActiveFile: (id: string) => void;
  updateContent: (id: string, content: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  openFiles: [],
  activeFileId: null,
  openFile: (node) => {
    if (node.type !== 'file') {
      return;
    }

    set((state) => {
      const existingFile = state.openFiles.find((file) => file.id === node.id);
      if (existingFile) {
        return {
          activeFileId: existingFile.id,
        };
      }

      const file: OpenFile = {
        id: node.id,
        name: node.name,
        language: node.language ?? 'plaintext',
        content: node.content ?? '',
        isDirty: false,
      };

      return {
        openFiles: [...state.openFiles, file],
        activeFileId: file.id,
      };
    });
  },
  closeFile: (id) => {
    set((state) => {
      const closingIndex = state.openFiles.findIndex((file) => file.id === id);
      if (closingIndex === -1) {
        return state;
      }

      const openFiles = state.openFiles.filter((file) => file.id !== id);
      if (state.activeFileId !== id) {
        return { openFiles };
      }

      const adjacentFile =
        openFiles[closingIndex] ??
        openFiles[closingIndex - 1] ??
        null;

      return {
        openFiles,
        activeFileId: adjacentFile?.id ?? null,
      };
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
        file.id === id
          ? {
              ...file,
              content,
              isDirty: true,
            }
          : file,
      ),
    }));
  },
}));
