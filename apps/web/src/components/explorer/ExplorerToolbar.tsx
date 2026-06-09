'use client';

import { RefreshCw, X } from 'lucide-react';

import { useExplorerStore } from '@/stores/explorer.store';

export function ExplorerToolbar() {
  const projectName = useExplorerStore((state) => state.projectName);
  const projectSource = useExplorerStore(
    (state) => state.projectSource,
  );
  const closeProject = useExplorerStore((state) => state.closeProject);
  const refreshTree = useExplorerStore((state) => state.refreshTree);
  const isLoading = useExplorerStore((state) => state.isLoading);

  if (!projectName) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
      <span
        className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium text-muted"
        title={projectName}
      >
        {projectSource === 'zip' ? `${projectName}.zip` : projectName}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        {projectSource === 'fsa' ? (
          <button
            aria-label="Refresh file tree"
            className="rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed"
            disabled={isLoading}
            onClick={() => void refreshTree()}
            title="Refresh file tree"
            type="button"
          >
            <RefreshCw
              className={isLoading ? 'animate-spin' : ''}
              size={12}
            />
          </button>
        ) : null}

        <button
          aria-label="Close project"
          className="rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-error"
          onClick={closeProject}
          title="Close project"
          type="button"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
