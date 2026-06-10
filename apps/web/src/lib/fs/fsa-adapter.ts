import type { FileNode } from '@/mock/file-tree';

import { detectLanguage } from './language-detector';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.turbo',
  'coverage',
  '.cache',
  '__pycache__',
  '.venv',
  'vendor',
  'target',
]);

const MAX_FILE_SIZE = 1_048_576;
const MAX_SCAN_DEPTH = 12;

export interface ScanResult {
  tree: FileNode[];
  fileHandles: Map<string, FileSystemFileHandle>;
  dirHandles: Map<string, FileSystemDirectoryHandle>;
}

export const fsaAdapter = {
  isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  },

  async openDirectory(): Promise<FileSystemDirectoryHandle> {
    if (!this.isSupported()) {
      throw new Error(
        'Folder access is not supported in this browser. Use Chrome or Edge, or upload a ZIP archive.',
      );
    }

    return window.showDirectoryPicker({ mode: 'readwrite' });
  },

  async readDirectory(
    rootHandle: FileSystemDirectoryHandle,
  ): Promise<ScanResult> {
    const fileHandles = new Map<string, FileSystemFileHandle>();
    const dirHandles = new Map<string, FileSystemDirectoryHandle>();
    const tree = await scanDirectory(
      rootHandle,
      '',
      fileHandles,
      dirHandles,
      0,
    );

    return { tree, fileHandles, dirHandles };
  },

  async readFile(
    handle: FileSystemFileHandle,
  ): Promise<string | null> {
    const file = await handle.getFile();
    if (file.size > MAX_FILE_SIZE) {
      return null;
    }

    const sample = new Uint8Array(
      await file.slice(0, Math.min(file.size, 8192)).arrayBuffer(),
    );
    if (sample.includes(0)) {
      return null;
    }

    return file.text();
  },

  async writeFile(
    handle: FileSystemFileHandle,
    content: string,
  ): Promise<void> {
    const writable = await handle.createWritable();
    try {
      await writable.write(content);
    } finally {
      await writable.close();
    }
  },

  async verifyPermission(
    handle: FileSystemDirectoryHandle,
  ): Promise<boolean> {
    const options: FileSystemHandlePermissionDescriptor = {
      mode: 'readwrite',
    };

    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }

    return (await handle.requestPermission(options)) === 'granted';
  },

  async createFile(
    rootHandle: FileSystemDirectoryHandle,
    filePath: string,
    content: string,
  ): Promise<FileSystemFileHandle> {
    const parts = filePath.split('/').filter(Boolean);
    const fileName = parts.pop();

    if (!fileName) {
      throw new Error('Invalid file path: no filename');
    }

    let currentDirectory = rootHandle;
    for (const part of parts) {
      currentDirectory = await currentDirectory.getDirectoryHandle(
        part,
        { create: true },
      );
    }

    const fileHandle = await currentDirectory.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(content);
    } finally {
      await writable.close();
    }

    return fileHandle;
  },
};

async function scanDirectory(
  handle: FileSystemDirectoryHandle,
  relativePath: string,
  fileHandles: Map<string, FileSystemFileHandle>,
  dirHandles: Map<string, FileSystemDirectoryHandle>,
  depth: number,
): Promise<FileNode[]> {
  if (depth > MAX_SCAN_DEPTH) {
    return [];
  }

  const nodes: FileNode[] = [];

  for await (const [name, entry] of handle.entries()) {
    const nodeId = relativePath ? `${relativePath}/${name}` : name;

    if (entry.kind === 'directory') {
      if (SKIP_DIRS.has(name)) {
        continue;
      }

      const directoryHandle = entry as FileSystemDirectoryHandle;
      dirHandles.set(nodeId, directoryHandle);
      const children = await scanDirectory(
        directoryHandle,
        nodeId,
        fileHandles,
        dirHandles,
        depth + 1,
      );
      nodes.push({
        id: nodeId,
        name,
        type: 'folder',
        children: sortNodes(children),
      });
      continue;
    }

    const fileHandle = entry as FileSystemFileHandle;
    fileHandles.set(nodeId, fileHandle);
    nodes.push({
      id: nodeId,
      name,
      type: 'file',
      language: detectLanguage(name),
    });
  }

  return sortNodes(nodes);
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return nodes.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'folder' ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}
