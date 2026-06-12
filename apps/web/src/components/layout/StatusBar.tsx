'use client';

import { Eye, TerminalSquare } from 'lucide-react';

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
  const terminalOpen = useSettingsStore(
    (state) => state.terminalOpen,
  );
  const bottomPanelTab = useSettingsStore(
    (state) => state.bottomPanelTab,
  );
  const toggleBottomPanel = useSettingsStore(
    (state) => state.toggleBottomPanel,
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
        <button
          aria-pressed={terminalOpen && bottomPanelTab === 'terminal'}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-px transition-colors hover:bg-white/20',
            terminalOpen && bottomPanelTab === 'terminal' && 'bg-white/20',
          )}
          onClick={() => toggleBottomPanel('terminal')}
          title="Toggle terminal (Ctrl+`)"
          type="button"
        >
          <TerminalSquare size={11} />
          Terminal
        </button>
        <button
          aria-pressed={terminalOpen && bottomPanelTab === 'preview'}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-px transition-colors hover:bg-white/20',
            terminalOpen && bottomPanelTab === 'preview' && 'bg-white/20',
          )}
          onClick={() => toggleBottomPanel('preview')}
          title="Toggle preview"
          type="button"
        >
          <Eye size={11} />
          Preview
        </button>
        <span className="h-3 w-px bg-white/40" />
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
