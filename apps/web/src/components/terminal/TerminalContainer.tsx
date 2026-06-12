'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { TerminalReadyInfo } from '@/lib/terminal-socket';
import { useSettingsStore } from '@/stores/settings.store';

import { ProjectPathPrompt } from './ProjectPathPrompt';
import { TerminalHeader } from './TerminalHeader';
import {
  TerminalPanel,
  type TerminalPanelHandle,
} from './TerminalPanel';

export function TerminalContainer() {
  const projectPath = useSettingsStore((state) => state.projectPath);
  const panelRef = useRef<TerminalPanelHandle>(null);
  const [info, setInfo] = useState<TerminalReadyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInfo(null);
    setError(null);
  }, [projectPath]);

  const handleReady = useCallback((readyInfo: TerminalReadyInfo) => {
    setInfo(readyInfo);
  }, []);
  const handleError = useCallback((message: string | null) => {
    setError(message);
  }, []);
  const handleRestart = useCallback(() => {
    setError(null);
    setInfo(null);
    panelRef.current?.restart();
  }, []);

  if (!projectPath) {
    return <ProjectPathPrompt />;
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <TerminalHeader
        error={error}
        info={info}
        onRestart={handleRestart}
      />
      <div className="min-h-0 flex-1">
        <TerminalPanel
          key={projectPath}
          onError={handleError}
          onReady={handleReady}
          projectPath={projectPath}
          ref={panelRef}
        />
      </div>
    </section>
  );
}
