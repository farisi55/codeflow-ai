'use client';

import {
  del as idbDel,
  get as idbGet,
  set as idbSet,
} from 'idb-keyval';
import { create } from 'zustand';

import { fsaAdapter } from '@/lib/fs/fsa-adapter';
import { zipAdapter } from '@/lib/fs/zip-adapter';
import type { FileNode } from '@/mock/file-tree';

const IDB_HANDLE_KEY = 'codeflow-root-handle';
const IDB_NAME_KEY = 'codeflow-project-name';

type ProjectSource = 'none' | 'fsa' | 'zip';

interface ExplorerState {
  projectSource: ProjectSource;
  projectName: string | null;
  isLoading: boolean;
  error: string | null;
  fileTree: FileNode[];
  expandedFolderIds: string[];
  selectedNodeId: string | null;
  rootHandle: FileSystemDirectoryHandle | null;
  fileHandles: Map<string, FileSystemFileHandle>;
  dirHandles: Map<string, FileSystemDirectoryHandle>;
  zipContents: Map<string, string>;
  lastProjectName: string | null;
  canRestore: boolean;
  savedHandle: FileSystemDirectoryHandle | null;
  openFolder: () => Promise<void>;
  openZip: (file: File) => Promise<void>;
  closeProject: () => void;
  refreshTree: () => Promise<void>;
  tryRestoreLastProject: () => Promise<void>;
  restoreLastProject: () => Promise<void>;
  openFileInEditor: (nodeId: string) => Promise<void>;
  saveFileContent: (nodeId: string, content: string) => Promise<void>;
  createFileInProject: (
    filePath: string,
    content: string,
  ) => Promise<void>;
  toggleFolder: (id: string) => void;
  selectNode: (id: string) => void;
  clearError: () => void;
}

const emptyHandleMaps = (): Pick<
  ExplorerState,
  'fileHandles' | 'dirHandles' | 'zipContents'
> => ({
  fileHandles: new Map(),
  dirHandles: new Map(),
  zipContents: new Map(),
});

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  projectSource: 'none',
  projectName: null,
  isLoading: false,
  error: null,
  fileTree: [],
  expandedFolderIds: [],
  selectedNodeId: null,
  rootHandle: null,
  ...emptyHandleMaps(),
  lastProjectName: null,
  canRestore: false,
  savedHandle: null,

  openFolder: async () => {
    set({ isLoading: true, error: null });
    try {
      const handle = await fsaAdapter.openDirectory();
      await resetEditor();
      await loadFromHandle(handle, set);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        set({ isLoading: false });
        return;
      }

      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to open folder',
        isLoading: false,
      });
    }
  },

  openZip: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const { tree, contents, projectName } =
        await zipAdapter.parseZip(file);
      await resetEditor();
      set({
        projectSource: 'zip',
        projectName,
        fileTree: tree,
        zipContents: contents,
        expandedFolderIds: topLevelFolderIds(tree),
        selectedNodeId: null,
        rootHandle: null,
        fileHandles: new Map(),
        dirHandles: new Map(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to parse ZIP archive',
        isLoading: false,
      });
    }
  },

  closeProject: () => {
    void clearPersistedProject();
    void resetEditor();
    set({
      projectSource: 'none',
      projectName: null,
      fileTree: [],
      expandedFolderIds: [],
      selectedNodeId: null,
      rootHandle: null,
      ...emptyHandleMaps(),
      canRestore: false,
      savedHandle: null,
      lastProjectName: null,
      error: null,
    });
  },

  refreshTree: async () => {
    const { rootHandle, projectSource, expandedFolderIds } = get();
    if (projectSource !== 'fsa' || !rootHandle) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { tree, fileHandles, dirHandles } =
        await fsaAdapter.readDirectory(rootHandle);
      set({
        fileTree: tree,
        fileHandles,
        dirHandles,
        expandedFolderIds: expandedFolderIds.filter((id) =>
          hasFolder(tree, id),
        ),
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to refresh project',
        isLoading: false,
      });
    }
  },

  tryRestoreLastProject: async () => {
    try {
      const handle =
        await idbGet<FileSystemDirectoryHandle>(IDB_HANDLE_KEY);
      const name = await idbGet<string>(IDB_NAME_KEY);
      if (handle && name) {
        set({
          savedHandle: handle,
          lastProjectName: name,
          canRestore: true,
        });
      }
    } catch {
      set({
        savedHandle: null,
        lastProjectName: null,
        canRestore: false,
      });
    }
  },

  restoreLastProject: async () => {
    const { savedHandle } = get();
    if (!savedHandle) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const granted = await fsaAdapter.verifyPermission(savedHandle);
      if (!granted) {
        set({
          canRestore: false,
          savedHandle: null,
          lastProjectName: null,
          isLoading: false,
          error: 'Folder permission was not granted.',
        });
        return;
      }

      await resetEditor();
      await loadFromHandle(savedHandle, set);
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to restore project',
        isLoading: false,
      });
    }
  },

  openFileInEditor: async (nodeId) => {
    const { projectSource, fileHandles, zipContents, fileTree } = get();
    const node = findNode(fileTree, nodeId);
    if (!node || node.type !== 'file') {
      return;
    }

    set({ selectedNodeId: nodeId, error: null });

    try {
      const { useEditorStore } = await import('@/stores/editor.store');
      let content = '';
      let isReadOnly = false;

      if (projectSource === 'fsa') {
        const handle = fileHandles.get(nodeId);
        if (!handle) {
          throw new Error(`No file handle found for ${nodeId}`);
        }
        const result = await fsaAdapter.readFile(handle);
        if (result === null) {
          content =
            'This binary or large file cannot be displayed and is read-only in CodeFlow AI.';
          isReadOnly = true;
        } else {
          content = result;
        }
      } else if (projectSource === 'zip') {
        content = zipContents.get(nodeId) ?? '';
      } else {
        return;
      }

      useEditorStore.getState().openFile({
        id: nodeId,
        name: node.name,
        language: node.language ?? 'plaintext',
        content,
        isDirty: false,
        isReadOnly,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to read file',
      });
    }
  },

  saveFileContent: async (nodeId, content) => {
    const { projectSource, fileHandles, zipContents } = get();
    set({ error: null });

    try {
      if (projectSource === 'fsa') {
        const handle = fileHandles.get(nodeId);
        if (!handle) {
          throw new Error(`No file handle found for ${nodeId}`);
        }
        await fsaAdapter.writeFile(handle, content);
        return;
      }

      if (projectSource === 'zip') {
        const nextContents = new Map(zipContents);
        nextContents.set(nodeId, content);
        set({ zipContents: nextContents });
        return;
      }

      throw new Error('No project is open.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save file';
      set({ error: message });
      throw error;
    }
  },

  createFileInProject: async (filePath, content) => {
    const { projectSource, rootHandle } = get();

    if (projectSource !== 'fsa' || !rootHandle) {
      throw new Error(
        projectSource === 'zip'
          ? 'ZIP projects are read-only. Open a folder project to create files.'
          : 'No project is open. Open a folder first.',
      );
    }

    await fsaAdapter.createFile(rootHandle, filePath, content);
    await get().refreshTree();

    if (!get().fileHandles.has(filePath)) {
      throw new Error(
        `Created ${filePath}, but the refreshed file tree could not find it.`,
      );
    }

    const { useEditorStore } = await import('@/stores/editor.store');
    const editorStore = useEditorStore.getState();
    if (editorStore.openFiles.some((file) => file.id === filePath)) {
      editorStore.closeFile(filePath);
    }

    await get().openFileInEditor(filePath);
  },

  toggleFolder: (id) => {
    set((state) => ({
      expandedFolderIds: state.expandedFolderIds.includes(id)
        ? state.expandedFolderIds.filter((folderId) => folderId !== id)
        : [...state.expandedFolderIds, id],
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id }),
  clearError: () => set({ error: null }),
}));

async function loadFromHandle(
  handle: FileSystemDirectoryHandle,
  set: (partial: Partial<ExplorerState>) => void,
): Promise<void> {
  const { tree, fileHandles, dirHandles } =
    await fsaAdapter.readDirectory(handle);

  try {
    await idbSet(IDB_HANDLE_KEY, handle);
    await idbSet(IDB_NAME_KEY, handle.name);
  } catch {
    // Persistence is optional; the active in-memory project still works.
  }

  set({
    projectSource: 'fsa',
    projectName: handle.name,
    rootHandle: handle,
    fileHandles,
    dirHandles,
    zipContents: new Map(),
    fileTree: tree,
    expandedFolderIds: topLevelFolderIds(tree),
    selectedNodeId: null,
    isLoading: false,
    error: null,
    canRestore: false,
    savedHandle: null,
    lastProjectName: handle.name,
  });
}

async function clearPersistedProject(): Promise<void> {
  try {
    await Promise.all([
      idbDel(IDB_HANDLE_KEY),
      idbDel(IDB_NAME_KEY),
    ]);
  } catch {
    // IndexedDB may be unavailable in private browsing contexts.
  }
}

async function resetEditor(): Promise<void> {
  const { useEditorStore } = await import('@/stores/editor.store');
  useEditorStore.getState().closeAllFiles();
}

function findNode(
  tree: FileNode[],
  targetId: string,
): FileNode | null {
  for (const node of tree) {
    if (node.id === targetId) {
      return node;
    }
    if (node.children) {
      const found = findNode(node.children, targetId);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function topLevelFolderIds(tree: FileNode[]): string[] {
  return tree
    .filter((node) => node.type === 'folder')
    .map((node) => node.id);
}

function hasFolder(tree: FileNode[], targetId: string): boolean {
  const node = findNode(tree, targetId);
  return node?.type === 'folder';
}
