import { create } from 'zustand';

import {
  MOCK_FILE_TREE,
  type FileNode,
} from '@/mock/file-tree';

interface ExplorerState {
  fileTree: FileNode[];
  expandedFolderIds: string[];
  selectedNodeId: string | null;
  toggleFolder: (id: string) => void;
  selectNode: (id: string) => void;
  setFileTree: (tree: FileNode[]) => void;
}

const topLevelFolderIds = MOCK_FILE_TREE.filter(
  (node) => node.type === 'folder',
).map((node) => node.id);

export const useExplorerStore = create<ExplorerState>((set) => ({
  fileTree: MOCK_FILE_TREE,
  expandedFolderIds: topLevelFolderIds,
  selectedNodeId: null,
  toggleFolder: (id) => {
    set((state) => ({
      expandedFolderIds: state.expandedFolderIds.includes(id)
        ? state.expandedFolderIds.filter((folderId) => folderId !== id)
        : [...state.expandedFolderIds, id],
    }));
  },
  selectNode: (id) => {
    set({ selectedNodeId: id });
  },
  setFileTree: (tree) => {
    set({ fileTree: tree });
  },
}));
