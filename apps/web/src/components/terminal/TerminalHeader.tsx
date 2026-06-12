'use client';

import {
  FolderPen,
  RotateCcw,
  TerminalSquare,
  X,
} from 'lucide-react';

import type { TerminalReadyInfo } from '@/lib/terminal-socket';
import { useSettingsStore } from '@/stores/settings.store';

interface TerminalHeaderProps {
  error: string | null;
  info: TerminalReadyInfo | null;
  onRestart: () => void;
}

export function TerminalHeader({
  error,
  info,
  onRestart,
}: TerminalHeaderProps) {
  const setProjectPath = useSettingsStore(
    (state) => state.setProjectPath,
  );
  const setTerminalOpen = useSettingsStore(
    (state) => state.setTerminalOpen,
  );

  return (
    <header className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
      <div className="flex min-w-0 items-center gap-2">
        <TerminalSquare className="shrink-0 text-muted" size={13} />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Terminal
        </span>
        {info ? (
          <span
            className="truncate font-mono text-[10px] text-muted/80"
            title={`${info.shell} - PID ${info.pid} - ${info.cwd}`}
          >
            {info.cwd}
          </span>
        ) : null}
        {error ? (
          <span className="truncate text-[10px] text-error" title={error}>
            {error}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          aria-label="Restart terminal"
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          onClick={onRestart}
          title="Restart terminal"
          type="button"
        >
          <RotateCcw size={13} />
        </button>
        <button
          aria-label="Change terminal directory"
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          onClick={() => setProjectPath('')}
          title="Change project directory"
          type="button"
        >
          <FolderPen size={13} />
        </button>
        <button
          aria-label="Close terminal"
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          onClick={() => setTerminalOpen(false)}
          title="Close terminal"
          type="button"
        >
          <X size={13} />
        </button>
      </div>
    </header>
  );
}
