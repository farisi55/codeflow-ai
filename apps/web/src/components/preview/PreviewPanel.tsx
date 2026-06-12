'use client';

import {
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  createPreviewSession,
  toPreviewUrl,
} from '@/lib/preview-api';
import { useSettingsStore } from '@/stores/settings.store';

export function PreviewPanel() {
  const projectPath = useSettingsStore((state) => state.projectPath);
  const setProjectPath = useSettingsStore(
    (state) => state.setProjectPath,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [root, setRoot] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPreview = useCallback(async () => {
    if (!projectPath) {
      setPreviewUrl(null);
      setRoot(null);
      setError('Set the same absolute project path used by the terminal.');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const session = await createPreviewSession(projectPath);
      setPreviewUrl(toPreviewUrl(session.url));
      setRoot(session.root);
      setIframeKey((value) => value + 1);
    } catch (caught) {
      setPreviewUrl(null);
      setRoot(null);
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to start preview.',
      );
    } finally {
      setIsStarting(false);
    }
  }, [projectPath]);

  useEffect(() => {
    void startPreview();
  }, [startPreview]);

  const reloadPreview = () => {
    setIframeKey((value) => value + 1);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="truncate font-mono text-[10px] text-success">
            Static
          </span>
          <span className="text-[10px] text-muted">|</span>
          <span
            className="truncate font-mono text-[10px] text-success"
            title={previewUrl ?? undefined}
          >
            {previewUrl ?? 'No preview running'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            aria-label="Change preview directory"
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            onClick={() => setProjectPath('')}
            title="Change project directory"
            type="button"
          >
            <Pencil size={13} />
          </button>
          <button
            aria-label="Restart preview"
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            disabled={isStarting}
            onClick={() => void startPreview()}
            title="Restart preview"
            type="button"
          >
            {isStarting ? (
              <Loader2 className="animate-spin" size={13} />
            ) : (
              <RotateCcw size={13} />
            )}
          </button>
          <button
            aria-label="Reload preview"
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            disabled={!previewUrl}
            onClick={reloadPreview}
            title="Reload iframe"
            type="button"
          >
            <RefreshCw size={13} />
          </button>
          <a
            aria-label="Open preview in new tab"
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            href={previewUrl ?? undefined}
            rel="noreferrer"
            target="_blank"
            title="Open preview in new tab"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </header>

      {error ? (
        <div className="m-4 rounded-md border border-error/40 bg-error/10 p-3 text-xs leading-5 text-error">
          {error}
        </div>
      ) : null}

      {previewUrl ? (
        <iframe
          className="min-h-0 flex-1 border-0 bg-white"
          key={iframeKey}
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
          src={previewUrl}
          title={`Preview ${root ?? ''}`}
        />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-muted">
          {isStarting ? 'Starting preview...' : 'Preview is not running.'}
        </div>
      )}
    </section>
  );
}
