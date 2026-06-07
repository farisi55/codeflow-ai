'use client';

import dynamic from 'next/dynamic';

import { useEditorStore } from '@/stores/editor.store';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-background text-sm text-muted">
      <span className="animate-pulse">Loading editor...</span>
    </div>
  ),
});

export function MonacoEditorWrapper() {
  const openFiles = useEditorStore((state) => state.openFiles);
  const activeFileId = useEditorStore((state) => state.activeFileId);
  const updateContent = useEditorStore((state) => state.updateContent);
  const activeFile =
    openFiles.find((file) => file.id === activeFileId) ?? null;

  if (!activeFile) {
    return null;
  }

  return (
    <MonacoEditor
      height="100%"
      language={activeFile.language}
      onChange={(value) => updateContent(activeFile.id, value ?? '')}
      options={{
        bracketPairColorization: { enabled: true },
        cursorBlinking: 'smooth',
        fontFamily: 'var(--font-geist-mono), Consolas, monospace',
        fontLigatures: true,
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        padding: { top: 12 },
        renderWhitespace: 'selection',
        scrollBeyondLastLine: false,
        smoothScrolling: true,
      }}
      path={activeFile.id}
      theme="vs-dark"
      value={activeFile.content}
      width="100%"
    />
  );
}
