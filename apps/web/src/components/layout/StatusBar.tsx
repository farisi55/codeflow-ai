'use client';

import { cn } from '@/lib/utils';
import { useAIStore } from '@/stores/ai.store';
import { useEditorStore } from '@/stores/editor.store';
import { useSettingsStore } from '@/stores/settings.store';

const statusDetails = {
  checking: {
    dotClassName: 'bg-slate-300',
    label: 'Connecting...',
  },
  connected: {
    dotClassName: 'bg-success',
    label: 'Backend Connected',
  },
  offline: {
    dotClassName: 'bg-warning',
    label: 'Offline Mode (Mock)',
  },
} as const;

export function StatusBar() {
  const openFiles = useEditorStore((state) => state.openFiles);
  const activeFileId = useEditorStore((state) => state.activeFileId);
  const backendStatus = useAIStore((state) => state.backendStatus);
  const selectedProvider = useAIStore((state) => state.selectedProvider);
  const selectedModel = useAIStore((state) => state.selectedModel);
  const openCodeEnabled = useSettingsStore(
    (state) => state.openCodeEnabled,
  );
  const activeFile =
    openFiles.find((file) => file.id === activeFileId) ?? null;
  const status = statusDetails[backendStatus];

  return (
    <footer className="flex h-[22px] shrink-0 items-center justify-between bg-accent px-3 text-[11px] text-white">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono">
          {activeFile?.name ?? 'No file open'}
        </span>
        {activeFile ? (
          <span className="rounded bg-white/15 px-1.5 py-px uppercase">
            {activeFile.language}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5">
          <span
            className={cn('h-1.5 w-1.5 rounded-full', status.dotClassName)}
          />
          {status.label}
        </span>
        {backendStatus === 'connected' ? (
          <>
            <span className="h-3 w-px bg-white/40" />
            <span>
              {openCodeEnabled
                ? 'opencode / Auto'
                : `${selectedProvider} / ${selectedModel}`}
            </span>
          </>
        ) : null}
      </div>
    </footer>
  );
}
