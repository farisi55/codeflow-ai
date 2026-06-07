'use client';

import { Settings } from 'lucide-react';

import { ModelSelector } from '@/components/ai-chat/ModelSelector';
import { ProviderSelector } from '@/components/ai-chat/ProviderSelector';

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
