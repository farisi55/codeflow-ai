'use client';

import { FileCode } from 'lucide-react';

import { WelcomeScreen } from '@/components/welcome/WelcomeScreen';
import { useDiffStore } from '@/stores/diff.store';
import { useEditorStore } from '@/stores/editor.store';
import { useExplorerStore } from '@/stores/explorer.store';

import { DiffPanel } from './DiffPanel';
import { EditorTabs } from './EditorTabs';
import { MonacoEditorWrapper } from './MonacoEditorWrapper';

export function EditorArea() {
  const openFiles = useEditorStore((state) => state.openFiles);
  const activeFileId = useEditorStore((state) => state.activeFileId);
  const projectSource = useExplorerStore(
    (state) => state.projectSource,
  );
  const isDiffOpen = useDiffStore((state) => state.isOpen);
  const hasActiveFile = openFiles.some((file) => file.id === activeFileId);

  if (projectSource === 'none') {
    return <WelcomeScreen />;
  }

  if (isDiffOpen) {
    return (
      <section className="flex h-full min-h-0 flex-col bg-background">
        {openFiles.length > 0 ? <EditorTabs /> : null}
        <div className="min-h-0 flex-1">
          <DiffPanel />
        </div>
      </section>
    );
  }

  if (!hasActiveFile) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 bg-background text-muted">
        <FileCode className="opacity-40" size={40} />
        <p className="text-sm">Select a file from the explorer</p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <EditorTabs />
      <div className="min-h-0 flex-1">
        <MonacoEditorWrapper />
      </div>
    </section>
  );
}
