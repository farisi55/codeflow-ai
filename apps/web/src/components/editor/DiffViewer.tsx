'use client';

import type {
  DiffEditorProps,
  DiffOnMount,
} from '@monaco-editor/react';
import dynamic from 'next/dynamic';
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';

import { useDiffStore } from '@/stores/diff.store';

const MonacoDiffEditor = dynamic(
  () =>
    import('@monaco-editor/react').then(
      (module) => module.DiffEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted">
        <span className="animate-pulse">Loading diff editor...</span>
      </div>
    ),
  },
);

export interface DiffViewerHandle {
  getModifiedContent: () => string;
}

interface DiffViewerProps {
  original: string;
  modified: string;
  language: string;
  renderSideBySide: boolean;
}

export const DiffViewer = forwardRef<
  DiffViewerHandle,
  DiffViewerProps
>(function DiffViewer(
  { original, modified, language, renderSideBySide },
  ref,
) {
  const diffEditorRef = useRef<Parameters<DiffOnMount>[0] | null>(
    null,
  );
  const setModifiedContent = useDiffStore(
    (state) => state.setModifiedContent,
  );

  useImperativeHandle(
    ref,
    () => ({
      getModifiedContent: () =>
        diffEditorRef.current?.getModifiedEditor().getValue() ??
        modified,
    }),
    [modified],
  );

  const handleMount: DiffOnMount = (editor) => {
    diffEditorRef.current = editor;
    editor.getModifiedEditor().onDidChangeModelContent(() => {
      setModifiedContent(editor.getModifiedEditor().getValue());
    });
  };

  const options: DiffEditorProps['options'] = {
    fontSize: 13,
    fontFamily: 'var(--font-geist-mono), Consolas, monospace',
    fontLigatures: true,
    renderSideBySide,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineHeight: 20,
    padding: { top: 12 },
    smoothScrolling: true,
    readOnly: false,
    originalEditable: false,
    diffWordWrap: 'on',
    ignoreTrimWhitespace: false,
  };

  return (
    <MonacoDiffEditor
      height="100%"
      language={language}
      modified={modified}
      onMount={handleMount}
      options={options}
      original={original}
      theme="vs-dark"
    />
  );
});
