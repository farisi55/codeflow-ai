'use client';

import { FilePlus, Loader2, Zap } from 'lucide-react';
import {
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import {
  getLargestFileBlock,
  toMonacoLanguage,
} from '@/lib/diff-utils';
import {
  suggestFilename,
  validateFilename,
} from '@/lib/file-intent-utils';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageData } from '@/stores/ai.store';
import { useDiffStore } from '@/stores/diff.store';
import { useEditorStore } from '@/stores/editor.store';
import { useExplorerStore } from '@/stores/explorer.store';

interface ChatMessageProps {
  message: ChatMessageData;
}

interface CreateFileButtonProps {
  code: string;
  language: string;
  suggestedPath?: string;
}

function CreateFileButton({
  code,
  language,
  suggestedPath,
}: CreateFileButtonProps) {
  const [showInput, setShowInput] = useState(false);
  const [filename, setFilename] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const projectSource = useExplorerStore(
    (state) => state.projectSource,
  );
  const createFileInProject = useExplorerStore(
    (state) => state.createFileInProject,
  );
  const isDisabled = projectSource === 'none';
  const isZip = projectSource === 'zip';

  function handleOpen(): void {
    if (isDisabled || isZip) {
      return;
    }

    setFilename(suggestedPath ?? suggestFilename(language));
    setShowInput(true);
    setError(null);
    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  }

  async function handleCreate(): Promise<void> {
    const trimmed = filename.trim();
    const validationError = validateFilename(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      await createFileInProject(trimmed, code);
      setCreated(trimmed);
      setShowInput(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Failed to create file',
      );
    } finally {
      setIsCreating(false);
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === 'Enter') {
      void handleCreate();
    }
    if (event.key === 'Escape') {
      setShowInput(false);
      setError(null);
    }
  }

  function handleCancel(): void {
    setShowInput(false);
    setError(null);
  }

  if (created) {
    return (
      <span className="text-[11px] text-success">
        {'\u2713'} Created {created}
      </span>
    );
  }

  if (showInput) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            className={cn(
              'min-w-0 flex-1 rounded bg-surface-2 px-2 py-1 font-mono text-[11px] text-foreground outline-none',
              error ? 'border border-error' : 'border border-accent',
            )}
            disabled={isCreating}
            onChange={(event) => {
              setFilename(event.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="filename.ext"
            ref={inputRef}
            style={{ maxWidth: 180 }}
            value={filename}
          />

          <button
            className="flex shrink-0 items-center gap-1 rounded bg-accent px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating || !filename.trim()}
            onClick={() => void handleCreate()}
            type="button"
          >
            {isCreating ? (
              <Loader2 className="animate-spin" size={10} />
            ) : (
              <FilePlus size={10} />
            )}
            {isCreating ? 'Creating...' : 'Create'}
          </button>

          <button
            aria-label="Cancel file creation"
            className="shrink-0 rounded px-1.5 py-1 text-[11px] text-muted hover:text-foreground"
            disabled={isCreating}
            onClick={handleCancel}
            type="button"
          >
            {'\u00d7'}
          </button>
        </div>

        {error ? (
          <p className="text-[10px] text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const buttonTitle = isDisabled
    ? 'Open a folder project first'
    : isZip
      ? 'ZIP projects are read-only. Open a folder to create files.'
      : 'Save this code as a new file in the project';

  return (
    <button
      className="flex shrink-0 items-center gap-1.5 rounded border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-50"
      disabled={isDisabled || isZip}
      onClick={handleOpen}
      title={buttonTitle}
      type="button"
    >
      <FilePlus size={11} />
      Save as new file
    </button>
  );
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
  const isCreateOperation = message.fileOperation?.type === 'create';

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
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isCreateOperation ? (
              <span className="text-[11px] text-muted">
                New file: {message.fileOperation?.path ?? 'auto-detect'}
              </span>
            ) : activeFile ? (
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
                Open a file to apply changes
              </span>
            )}

            <CreateFileButton
              code={codeBlock.code}
              language={codeBlock.language}
              suggestedPath={message.fileOperation?.path}
            />

            <span className="ml-auto text-[11px] text-muted">
              {codeBlock.lineCount} lines
            </span>
          </div>
        </div>
      ) : null}
      <span className="mt-1 px-1 text-[10px] text-muted">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
