'use client';

import { Eye, FolderOpen } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useSettingsStore } from '@/stores/settings.store';

export function PreviewPathPrompt() {
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
            <Eye size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">
              Connect website preview
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Use the same absolute project path as the terminal.
              CodeFlow will run a detected dev script or serve static
              HTML directly.
            </p>
          </div>
        </div>
        <label
          className="mb-1.5 block text-xs font-medium text-foreground"
          htmlFor="preview-project-path"
        >
          Project directory
        </label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 focus-within:border-accent">
          <FolderOpen className="shrink-0 text-muted" size={15} />
          <input
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-xs outline-none placeholder:text-muted/60"
            id="preview-project-path"
            onChange={(event) => setValue(event.target.value)}
            placeholder="C:\Projects\my-app"
            spellCheck={false}
            value={value}
          />
        </div>
        <p className="mt-2 text-[11px] text-warning">
          Dev scripts run with the same file access as the backend.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
            onClick={toggleBottomPanel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!value.trim()}
            type="submit"
          >
            Start preview
          </button>
        </div>
      </form>
    </div>
  );
}
