'use client';

import { FolderOpen, TerminalSquare } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useSettingsStore } from '@/stores/settings.store';

export function ProjectPathPrompt() {
  const setProjectPath = useSettingsStore(
    (state) => state.setProjectPath,
  );
  const toggleBottomPanel = useSettingsStore(
    (state) => state.toggleBottomPanel,
  );
  const [value, setValue] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (value.trim()) {
      setProjectPath(value);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-background p-6">
      <form
        className="w-full max-w-lg rounded-lg border border-border bg-surface p-5 shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="rounded-md bg-accent/15 p-2 text-accent">
            <TerminalSquare size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">
              Connect the integrated terminal
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Enter the absolute path of the folder opened in the
              explorer. The terminal process will run from this
              directory on your machine.
            </p>
          </div>
        </div>
        <label
          className="mb-1.5 block text-xs font-medium text-foreground"
          htmlFor="terminal-project-path"
        >
          Project directory
        </label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 focus-within:border-accent">
          <FolderOpen className="shrink-0 text-muted" size={15} />
          <input
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-xs outline-none placeholder:text-muted/60"
            id="terminal-project-path"
            onChange={(event) => setValue(event.target.value)}
            placeholder="C:\Projects\my-app"
            spellCheck={false}
            value={value}
          />
        </div>
        <p className="mt-2 text-[11px] text-warning">
          Commands have the same file access as the backend process.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
            onClick={() => toggleBottomPanel('terminal')}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!value.trim()}
            type="submit"
          >
            Start terminal
          </button>
        </div>
      </form>
    </div>
  );
}
