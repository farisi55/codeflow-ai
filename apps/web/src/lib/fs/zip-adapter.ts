import JSZip from 'jszip';

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

export interface ZipResult {
  tree: FileNode[];
  contents: Map<string, string>;
  projectName: string;
}

export const zipAdapter = {
  async parseZip(file: File): Promise<ZipResult> {
    const zip = await JSZip.loadAsync(file);
    const contents = new Map<string, string>();
    const allPaths: string[] = [];
    const readPromises: Promise<void>[] = [];

    zip.forEach((relativePath, entry) => {
      const cleanPath = normalizePath(relativePath);
      if (
        entry.dir ||
        !cleanPath ||
        cleanPath.split('/').some((segment) => SKIP_DIRS.has(segment))
      ) {
        return;
      }

      readPromises.push(
        entry.async('string').then((content) => {
          contents.set(cleanPath, content);
          allPaths.push(cleanPath);
        }),
      );
    });

    await Promise.all(readPromises);

    return {
      tree: buildTreeFromPaths(allPaths),
      contents,
      projectName: file.name.replace(/\.zip$/i, ''),
    };
  },
};

function buildTreeFromPaths(paths: string[]): FileNode[] {
  const directoryMap = new Map<string, FileNode[]>();
  directoryMap.set('', []);

  for (const fullPath of [...paths].sort()) {
    const cleanPath = normalizePath(fullPath);
    const parts = cleanPath.split('/').filter(Boolean);
    const fileName = parts.at(-1);
    if (!fileName) {
      continue;
    }

    let currentPath = '';
    for (const segment of parts.slice(0, -1)) {
      const nodePath = currentPath
        ? `${currentPath}/${segment}`
        : segment;

      if (!directoryMap.has(nodePath)) {
        const children: FileNode[] = [];
        directoryMap.set(nodePath, children);
        directoryMap.get(currentPath)?.push({
          id: nodePath,
          name: segment,
          type: 'folder',
          children,
        });
      }
      currentPath = nodePath;
    }

    directoryMap.get(currentPath)?.push({
      id: cleanPath,
      name: fileName,
      type: 'file',
      language: detectLanguage(fileName),
    });
  }

  return sortTree(directoryMap.get('') ?? []);
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
}

function sortTree(nodes: FileNode[]): FileNode[] {
  for (const node of nodes) {
    if (node.children) {
      sortTree(node.children);
    }
  }

  return nodes.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'folder' ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}
