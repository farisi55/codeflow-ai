'use client';

import {
  Edit2,
  ExternalLink,
  Eye,
  Loader2,
  Play,
  RefreshCw,
  RotateCw,
  Square,
} from 'lucide-react';

import type { PreviewStatus } from '@/lib/preview-socket';
import { useSettingsStore } from '@/stores/settings.store';

interface PreviewHeaderProps {
  onRefresh: () => void;
  onRestart: () => void;
  onStart: () => void;
  onStop: () => void;
  status: PreviewStatus;
}

export function PreviewHeader({
  onRefresh,
  onRestart,
  onStart,
  onStop,
  status,
}: PreviewHeaderProps) {
  const setProjectPath = useSettingsStore(
    (state) => state.setProjectPath,
  );
  const isRunning = status.phase === 'ready';
  const isBusy =
    status.phase === 'detecting' || status.phase === 'starting';

  return (
    <header className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Eye className="shrink-0 text-muted" size={13} />
        {isBusy ? (
          <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[10px] text-muted">
            <Loader2 className="shrink-0 animate-spin" size={11} />
            {status.phase === 'starting'
              ? `Running ${status.command ?? 'dev server'}...`
              : 'Detecting project type...'}
          </span>
        ) : null}
        {isRunning ? (
          <span
            className="truncate font-mono text-[10px] text-success"
            title={status.url}
          >
            {status.mode === 'static'
              ? 'Static'
              : `Port ${status.port ?? '?'}`}
            {' | '}
            {status.url}
          </span>
        ) : null}
        {status.phase === 'error' ? (
          <span
            className="truncate text-[10px] text-error"
            title={status.message}
          >
            {status.message ?? 'Preview error'}
          </span>
        ) : null}
        {status.phase === 'idle' || status.phase === 'stopped' ? (
          <span className="text-[10px] text-muted">
            {status.phase === 'stopped' ? 'Stopped' : 'Preview'}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          aria-label="Change preview directory"
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          onClick={() => setProjectPath('')}
          title="Change project directory"
          type="button"
        >
          <Edit2 size={13} />
        </button>
        {isRunning && status.url ? (
          <>
            <button
              aria-label="Reload preview"
              className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
              onClick={onRefresh}
              title="Reload preview"
              type="button"
            >
              <RefreshCw size={13} />
            </button>
            <a
              aria-label="Open preview in new tab"
              className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
              href={status.url}
              rel="noopener noreferrer"
              target="_blank"
              title="Open in new tab"
            >
              <ExternalLink size={13} />
            </a>
          </>
        ) : null}
        <button
          aria-label="Restart preview"
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isBusy}
          onClick={onRestart}
          title="Restart preview"
          type="button"
        >
          <RotateCw size={13} />
        </button>
        {isRunning || isBusy ? (
          <button
            className="ml-1 flex items-center gap-1 rounded border border-error px-1.5 py-0.5 text-[10px] text-error hover:bg-error/10"
            onClick={onStop}
            type="button"
          >
            <Square size={9} />
            Stop
          </button>
        ) : (
          <button
            className="ml-1 flex items-center gap-1 rounded border border-success px-1.5 py-0.5 text-[10px] text-success hover:bg-success/10"
            onClick={onStart}
            type="button"
          >
            <Play size={9} />
            Start
          </button>
        )}
      </div>
    </header>
  );
}
