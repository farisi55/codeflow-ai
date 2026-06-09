'use client';

import { useEffect } from 'react';

import { useExplorerStore } from '@/stores/explorer.store';

import { ExplorerToolbar } from './ExplorerToolbar';
import { FileTreeNode } from './FileTreeNode';

export function FileExplorer() {
  const fileTree = useExplorerStore((state) => state.fileTree);
  const error = useExplorerStore((state) => state.error);
  const projectSource = useExplorerStore(
    (state) => state.projectSource,
  );
  const tryRestoreLastProject = useExplorerStore(
    (state) => state.tryRestoreLastProject,
  );

  useEffect(() => {
    void tryRestoreLastProject();
  }, [tryRestoreLastProject]);

  return (
    <aside
      aria-label="File explorer"
      className="flex h-full flex-col overflow-hidden bg-surface"
    >
      <div className="shrink-0 px-4 py-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Explorer
        </h2>
      </div>
      <ExplorerToolbar />
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        {fileTree.map((node) => (
          <FileTreeNode depth={0} key={node.id} node={node} />
        ))}
        {projectSource !== 'none' && fileTree.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted">
            No files found in this project.
          </p>
        ) : null}
        {projectSource !== 'none' && error ? (
          <p className="px-4 py-3 text-xs text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
