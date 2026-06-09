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
  const isSaving = useEditorStore((state) => state.isSaving);
  const activeFile =
    openFiles.find((file) => file.id === activeFileId) ?? null;

  if (!activeFile) {
    return null;
  }

  return (
    <div className="relative h-full">
      {isSaving ? (
        <div className="pointer-events-none absolute right-4 top-2 z-10 text-[10px] text-muted">
          Saving...
        </div>
      ) : activeFile.isReadOnly ? (
        <div className="pointer-events-none absolute right-4 top-2 z-10 text-[10px] text-warning">
          Read-only
        </div>
      ) : null}
      <MonacoEditor
        height="100%"
        language={activeFile.language}
        onChange={(value) =>
          updateContent(activeFile.id, value ?? '')
        }
        onMount={(editor, monaco) => {
          editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
            () => {
              void useEditorStore.getState().saveActiveFile();
            },
          );
        }}
        options={{
          bracketPairColorization: { enabled: true },
          cursorBlinking: 'smooth',
          fontFamily:
            'var(--font-geist-mono), Consolas, monospace',
          fontLigatures: true,
          fontSize: 13,
          lineHeight: 20,
          minimap: { enabled: false },
          padding: { top: 12 },
          readOnly: activeFile.isReadOnly,
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
        }}
        path={activeFile.id}
        theme="vs-dark"
        value={activeFile.content}
        width="100%"
      />
    </div>
  );
}
