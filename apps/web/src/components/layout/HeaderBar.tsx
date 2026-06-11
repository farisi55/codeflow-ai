'use client';

import { Bot, Settings, Zap } from 'lucide-react';
import { useEffect } from 'react';

import { ModelSelector } from '@/components/ai-chat/ModelSelector';
import { ProviderSelector } from '@/components/ai-chat/ProviderSelector';
import { useSettingsStore } from '@/stores/settings.store';

function CodeLogo() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="m8.5 5-5 7 5 7M15.5 5l5 7-5 7M14 3l-4 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function HeaderBar() {
  const autoApply = useSettingsStore((state) => state.autoApply);
  const toggleAutoApply = useSettingsStore(
    (state) => state.toggleAutoApply,
  );
  const openCodeEnabled = useSettingsStore(
    (state) => state.openCodeEnabled,
  );
  const toggleOpenCode = useSettingsStore(
    (state) => state.toggleOpenCode,
  );

  useEffect(() => {
    void useSettingsStore.persist.rehydrate();
  }, []);

  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2 font-mono text-sm font-semibold text-accent">
        <CodeLogo />
        <span>CodeFlow AI</span>
      </div>
      <div className="flex items-center gap-3">
        <ProviderSelector />
        <ModelSelector />
        <button
          className={
            openCodeEnabled
              ? 'flex items-center gap-1 rounded border border-success bg-[rgba(63,185,80,0.15)] px-2 py-1 text-[11px] font-medium text-success transition-all'
              : 'flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted transition-all hover:text-foreground'
          }
          onClick={toggleOpenCode}
          title={
            openCodeEnabled
              ? 'OpenCode ON - click to use the AI Gateway'
              : 'AI Gateway ON - click to use OpenCode'
          }
          type="button"
        >
          <Bot size={11} />
          {openCodeEnabled ? 'OpenCode' : 'Gateway'}
        </button>
        <button
          className={
            autoApply
              ? 'flex items-center gap-1 rounded border border-accent bg-accent px-2 py-1 text-[11px] font-medium text-white transition-all'
              : 'flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted transition-all hover:text-foreground'
          }
          onClick={toggleAutoApply}
          title={
            autoApply
              ? 'Auto-Apply ON - AI code applies instantly. Click to switch to Manual.'
              : 'Manual mode - review before applying. Click to enable Auto-Apply.'
          }
          type="button"
        >
          <Zap size={11} />
          {autoApply ? 'Auto' : 'Manual'}
        </button>
        <button
          aria-label="Settings"
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          type="button"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
