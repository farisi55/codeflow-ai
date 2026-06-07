'use client';

import { FileCode } from 'lucide-react';

import { useEditorStore } from '@/stores/editor.store';

import { EditorTabs } from './EditorTabs';
import { MonacoEditorWrapper } from './MonacoEditorWrapper';

export function EditorArea() {
  const openFiles = useEditorStore((state) => state.openFiles);
  const activeFileId = useEditorStore((state) => state.activeFileId);
  const hasActiveFile = openFiles.some((file) => file.id === activeFileId);

  if (!hasActiveFile) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 bg-background text-muted">
        <FileCode size={48} strokeWidth={1.2} />
        <p className="text-sm">Open a file to start editing</p>
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
