'use client';

import { RefreshCw, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor.store';

export function EditorTabs() {
  const openFiles = useEditorStore((state) => state.openFiles);
  const activeFileId = useEditorStore((state) => state.activeFileId);
  const setActiveFile = useEditorStore((state) => state.setActiveFile);
  const closeFile = useEditorStore((state) => state.closeFile);
  const isSaving = useEditorStore((state) => state.isSaving);

  return (
    <div
      aria-label="Open files"
      className="flex h-[35px] shrink-0 overflow-x-auto whitespace-nowrap border-b border-border bg-surface"
      role="tablist"
    >
      {openFiles.map((file) => {
        const isActive = file.id === activeFileId;

        function handleKeyDown(
          event: KeyboardEvent<HTMLDivElement>,
        ): void {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setActiveFile(file.id);
          }
        }

        return (
          <div
            aria-selected={isActive}
            className={cn(
              'flex h-full shrink-0 items-center gap-2 border-r border-border px-3 font-mono text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground',
              isActive &&
                'border-t-2 border-t-accent bg-transparent text-foreground hover:bg-transparent',
            )}
            key={file.id}
            onClick={() => setActiveFile(file.id)}
            onKeyDown={handleKeyDown}
            role="tab"
            tabIndex={0}
          >
            <span>{file.name}</span>
            {isSaving && isActive ? (
              <RefreshCw
                aria-label="Saving"
                className="animate-spin text-muted"
                size={10}
              />
            ) : file.isDirty ? (
              <span
                aria-label="Unsaved changes"
                className="text-warning"
              >
                {'\u2022'}
              </span>
            ) : null}
            <button
              aria-label={`Close ${file.name}`}
              className="rounded p-0.5 text-muted transition-colors hover:bg-surface-2 hover:text-error"
              onClick={(event) => {
                event.stopPropagation();
                closeFile(file.id);
              }}
              type="button"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
