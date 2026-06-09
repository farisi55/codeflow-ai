'use client';

import { Zap } from 'lucide-react';

import {
  getLargestFileBlock,
  toMonacoLanguage,
} from '@/lib/diff-utils';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageData } from '@/stores/ai.store';
import { useDiffStore } from '@/stores/diff.store';
import { useEditorStore } from '@/stores/editor.store';

interface ChatMessageProps {
  message: ChatMessageData;
}

function formatTime(timestamp: Date): string {
  return timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderMessageContent(content: string) {
  return content.split('```').map((part, index) => {
    if (index % 2 === 1) {
      const code = part.replace(/^[a-zA-Z0-9_-]+\n/, '');
      return (
        <pre
          className="my-2 overflow-x-auto rounded bg-surface p-2 text-xs"
          key={`code-${index}`}
        >
          <code className="font-mono text-foreground">{code.trimEnd()}</code>
        </pre>
      );
    }

    return (
      <span className="whitespace-pre-wrap" key={`text-${index}`}>
        {part}
      </span>
    );
  });
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const openDiff = useDiffStore((state) => state.openDiff);
  const openFiles = useEditorStore((state) => state.openFiles);
  const activeFileId = useEditorStore((state) => state.activeFileId);
  const codeBlock =
    !message.isStreaming && message.role === 'assistant'
      ? getLargestFileBlock(message.content)
      : null;
  const activeFile =
    openFiles.find((file) => file.id === activeFileId) ?? null;

  function handleApplyToFile(): void {
    if (!codeBlock || !activeFile || activeFile.isReadOnly) {
      return;
    }

    const codeLanguage = toMonacoLanguage(codeBlock.language);
    openDiff({
      fileId: activeFile.id,
      fileName: activeFile.name,
      language:
        codeLanguage === 'plaintext'
          ? activeFile.language
          : codeLanguage,
      originalContent: activeFile.content,
      modifiedContent: codeBlock.code,
    });
  }

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'rounded-lg p-2.5 text-sm leading-5',
          isUser
            ? 'ml-auto max-w-[85%] border border-[rgba(47,129,247,0.2)] bg-[rgba(47,129,247,0.15)]'
            : 'max-w-[90%] bg-surface-2',
        )}
      >
        {renderMessageContent(message.content)}
        {message.isStreaming ? (
          <span className="cursor-blink" aria-label="Streaming response">
            |
          </span>
        ) : null}
      </div>
      {codeBlock ? (
        <div className="mt-2 flex items-center gap-2">
          {activeFile ? (
            <button
              className="flex items-center gap-1.5 rounded border border-accent bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-[rgba(47,129,247,0.15)] disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
              disabled={activeFile.isReadOnly}
              onClick={handleApplyToFile}
              type="button"
            >
              <Zap size={11} />
              {activeFile.isReadOnly
                ? `${activeFile.name} is read-only`
                : `Apply to ${activeFile.name}`}
            </button>
          ) : (
            <span className="text-[11px] text-muted">
              Open a file to apply these changes
            </span>
          )}
          <span className="text-[11px] text-muted">
            {codeBlock.lineCount} lines
          </span>
        </div>
      ) : null}
      <span className="mt-1 px-1 text-[10px] text-muted">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
