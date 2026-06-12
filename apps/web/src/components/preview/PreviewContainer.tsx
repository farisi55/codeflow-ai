'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { PreviewStatus } from '@/lib/preview-socket';
import { useSettingsStore } from '@/stores/settings.store';

import { PreviewHeader } from './PreviewHeader';
import {
  PreviewPanel,
  type PreviewPanelHandle,
} from './PreviewPanel';
import { PreviewPathPrompt } from './PreviewPathPrompt';

export function PreviewContainer() {
  const projectPath = useSettingsStore((state) => state.projectPath);
  const panelRef = useRef<PreviewPanelHandle>(null);
  const [status, setStatus] = useState<PreviewStatus>({
    phase: 'idle',
  });

  useEffect(() => {
    setStatus({ phase: projectPath ? 'detecting' : 'idle' });
  }, [projectPath]);

  const handleStatusChange = useCallback(
    (nextStatus: PreviewStatus) => {
      setStatus(nextStatus);
    },
    [],
  );

  if (!projectPath) {
    return <PreviewPathPrompt />;
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <PreviewHeader
        onRefresh={() => panelRef.current?.refreshIframe()}
        onRestart={() => panelRef.current?.restart()}
        onStart={() => panelRef.current?.start()}
        onStop={() => panelRef.current?.stop()}
        status={status}
      />
      <div className="relative min-h-0 flex-1">
        {status.phase !== 'ready' ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background px-6">
            {status.phase === 'detecting' ||
            status.phase === 'starting' ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="animate-spin" size={15} />
                {status.phase === 'starting'
                  ? `Running ${status.command ?? 'dev server'}...`
                  : 'Detecting project type...'}
              </div>
            ) : status.phase === 'error' ? (
              <div className="flex max-w-md flex-col items-center gap-2 text-center">
                <AlertTriangle className="text-error" size={22} />
                <span className="text-xs text-error">
                  {status.message}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted">
                Click Start to launch preview
              </span>
            )}
          </div>
        ) : null}
        <PreviewPanel
          key={projectPath}
          onStatusChange={handleStatusChange}
          projectPath={projectPath}
          ref={panelRef}
        />
      </div>
    </section>
  );
}
