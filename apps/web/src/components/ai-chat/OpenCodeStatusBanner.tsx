'use client';

import {
  AlertTriangle,
  Bot,
  RefreshCw,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { apiClient } from '@/lib/api-client';
import type { OpenCodeHealthResponse } from '@/types/api.types';

export function OpenCodeStatusBanner() {
  const [health, setHealth] =
    useState<OpenCodeHealthResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    const nextHealth = await apiClient.checkOpenCodeHealth();
    setHealth(nextHealth);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    void checkHealth();
    const timer = window.setInterval(() => {
      void checkHealth();
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [checkHealth]);

  if (!health) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface-2 px-3 py-2 text-[11px] text-muted">
        <RefreshCw className="animate-spin" size={11} />
        Checking OpenCode...
      </div>
    );
  }

  if (!health.installed) {
    return (
      <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-[rgba(248,81,73,0.06)] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-error">
            <AlertTriangle size={11} />
            OpenCode not installed
          </span>
          <button
            className="flex items-center gap-1 text-[10px] text-muted hover:text-foreground disabled:opacity-60"
            disabled={isChecking}
            onClick={() => void checkHealth()}
            type="button"
          >
            <RefreshCw
              className={isChecking ? 'animate-spin' : undefined}
              size={9}
            />
            Retry
          </button>
        </div>
        <code className="select-all rounded bg-surface-2 px-2 py-1.5 text-[10px] text-muted">
          npm install -g opencode-ai
        </code>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-[rgba(63,185,80,0.06)] px-3 py-2">
      <Bot className="shrink-0 text-success" size={12} />
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] font-medium text-success">
          OpenCode ready
          {health.version ? ` ${health.version}` : ''}
        </span>
        <span className="truncate text-[10px] text-muted">
          Active file and project structure are injected as context
        </span>
      </div>
    </div>
  );
}
