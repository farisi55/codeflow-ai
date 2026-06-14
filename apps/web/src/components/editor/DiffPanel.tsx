'use client';

import {
  AlignJustify,
  Check,
  Columns2,
  X,
  Zap,
} from 'lucide-react';
import { useRef, useState } from 'react';

import { useDiffStore } from '@/stores/diff.store';
import { useExplorerStore } from '@/stores/explorer.store';

import { DiffViewer, type DiffViewerHandle } from './DiffViewer';

export function DiffPanel() {
  const fileName = useDiffStore((state) => state.fileName);
  const language = useDiffStore((state) => state.language);
  const originalContent = useDiffStore(
    (state) => state.originalContent,
  );
  const modifiedContent = useDiffStore(
    (state) => state.modifiedContent,
  );
  const renderSideBySide = useDiffStore(
    (state) => state.renderSideBySide,
  );
  const fileId = useDiffStore((state) => state.fileId);
  const queue = useDiffStore((state) => state.queue);
  const queueIndex = useDiffStore((state) => state.queueIndex);
  const advanceDiff = useDiffStore((state) => state.advanceDiff);
  const toggleRenderMode = useDiffStore(
    (state) => state.toggleRenderMode,
  );
  const upsertFileInProject = useExplorerStore(
    (state) => state.upsertFileInProject,
  );
  const diffViewerRef = useRef<DiffViewerHandle>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasNext = queueIndex < queue.length - 1;

  async function handleAccept(): Promise<void> {
    if (!fileId) {
      return;
    }

    setSaveError(null);
    const finalContent =
      diffViewerRef.current?.getModifiedContent() ?? modifiedContent;
    setIsSaving(true);
    try {
      await upsertFileInProject(fileId, finalContent);
      advanceDiff();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Could not apply this file.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard(): void {
    setSaveError(null);
    advanceDiff();
  }

  return (
    <section className="flex h-full flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Zap className="shrink-0 text-accent" size={14} />
          <span className="truncate text-xs font-medium text-muted">
            AI suggested changes
          </span>
          {fileName ? (
            <>
              <span className="text-border">{'\u00b7'}</span>
              <span className="truncate font-mono text-xs text-foreground">
                {fileName}
              </span>
              {queue.length > 1 ? (
                <span className="text-[10px] text-muted">
                  {queueIndex + 1}/{queue.length}
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted transition-colors hover:text-foreground"
            onClick={toggleRenderMode}
            title={
              renderSideBySide
                ? 'Switch to inline diff'
                : 'Switch to side-by-side diff'
            }
            type="button"
          >
            {renderSideBySide ? (
              <>
                <Columns2 size={12} />
                Side by side
              </>
            ) : (
              <>
                <AlignJustify size={12} />
                Inline
              </>
            )}
          </button>

          <div className="h-4 w-px bg-border" />

          <button
            className="flex items-center gap-1.5 rounded border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
            disabled={isSaving}
            onClick={handleDiscard}
            type="button"
          >
            <X size={12} />
            {hasNext ? 'Discard & Next' : 'Discard'}
          </button>

          <button
            className="flex items-center gap-1.5 rounded bg-success px-3 py-1 text-xs font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
            disabled={isSaving}
            onClick={() => void handleAccept()}
            type="button"
          >
            <Check size={12} />
            {isSaving
              ? 'Applying...'
              : hasNext
                ? 'Accept & Next'
                : 'Accept Changes'}
          </button>
        </div>
      </div>

      {saveError ? (
        <div
          className="shrink-0 border-b border-border bg-surface px-4 py-1.5 text-xs text-error"
          role="alert"
        >
          {saveError}
        </div>
      ) : null}

      {renderSideBySide ? (
        <div className="flex shrink-0 border-b border-border bg-surface px-4 py-1 text-[10px] text-muted">
          <div className="flex-1">Original (read-only)</div>
          <div className="flex-1">Modified (editable)</div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <DiffViewer
          key={`${fileId ?? 'diff'}-${queueIndex}`}
          language={language}
          modified={modifiedContent}
          original={originalContent}
          ref={diffViewerRef}
          renderSideBySide={renderSideBySide}
        />
      </div>
    </section>
  );
}
