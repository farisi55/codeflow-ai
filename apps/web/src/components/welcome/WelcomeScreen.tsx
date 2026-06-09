'use client';

import { FolderOpen, RotateCcw, Upload } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';

import { useExplorerStore } from '@/stores/explorer.store';

export function WelcomeScreen() {
  const openFolder = useExplorerStore((state) => state.openFolder);
  const openZip = useExplorerStore((state) => state.openZip);
  const restoreLastProject = useExplorerStore(
    (state) => state.restoreLastProject,
  );
  const lastProjectName = useExplorerStore(
    (state) => state.lastProjectName,
  );
  const canRestore = useExplorerStore((state) => state.canRestore);
  const isLoading = useExplorerStore((state) => state.isLoading);
  const error = useExplorerStore((state) => state.error);
  const zipInputRef = useRef<HTMLInputElement>(null);

  function handleZipChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.target.files?.[0];
    if (file) {
      void openZip(file);
    }
    event.target.value = '';
  }

  return (
    <section className="flex h-full flex-col items-center justify-center gap-8 bg-background px-8">
      <div className="flex select-none flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-2 font-mono text-2xl font-bold text-accent">
          {'</>'}
        </div>
        <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
          CodeFlow AI
        </h1>
        <p className="max-w-xs text-center text-xs text-muted">
          Open a local project folder to start editing with AI assistance
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {canRestore && lastProjectName ? (
          <button
            className="flex w-full items-center gap-3 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
            onClick={() => void restoreLastProject()}
            type="button"
          >
            <RotateCcw size={16} />
            <span className="truncate">
              Reopen: {lastProjectName}
            </span>
          </button>
        ) : null}

        <button
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading}
          onClick={() => void openFolder()}
          type="button"
        >
          <FolderOpen className="text-accent" size={16} />
          Open Folder
        </button>

        <button
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading}
          onClick={() => zipInputRef.current?.click()}
          type="button"
        >
          <Upload size={16} />
          Upload ZIP archive
        </button>
        <input
          accept=".zip,application/zip"
          className="hidden"
          onChange={handleZipChange}
          ref={zipInputRef}
          type="file"
        />
      </div>

      {isLoading ? (
        <p className="animate-pulse text-xs text-muted">
          Scanning project...
        </p>
      ) : null}

      {error ? (
        <p
          className="max-w-md text-center text-xs text-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <p className="text-[10px] text-muted">
        Chrome / Edge required for folder access. Firefox: use ZIP upload.
      </p>
    </section>
  );
}
