'use client';

import { useExplorerStore } from '@/stores/explorer.store';

import { FileTreeNode } from './FileTreeNode';

export function FileExplorer() {
  const fileTree = useExplorerStore((state) => state.fileTree);

  return (
    <aside
      aria-label="File explorer"
      className="h-full overflow-y-auto bg-surface"
    >
      <div className="px-4 py-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Explorer
        </h2>
      </div>
      <div className="pb-3">
        {fileTree.map((node) => (
          <FileTreeNode depth={0} key={node.id} node={node} />
        ))}
      </div>
    </aside>
  );
}
