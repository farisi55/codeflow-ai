'use client';

import {
  FileCode,
  FilePlus,
  Loader2,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import {
  getDeleteRequests,
  getLargestFileBlock,
  getNamedFileBlocks,
  toMonacoLanguage,
  type DeleteRequest,
  type FileBlock,
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

type FileWriteStatus =
  | 'idle'
  | 'writing'
  | 'created'
  | 'updated'
  | 'error';

interface MultiFileActionsProps {
  blocks: FileBlock[];
}

function MultiFileActions({ blocks }: MultiFileActionsProps) {
  const projectSource = useExplorerStore(
    (state) => state.projectSource,
  );
  const fileHandles = useExplorerStore((state) => state.fileHandles);
  const upsertFileInProject = useExplorerStore(
    (state) => state.upsertFileInProject,
  );
  const [statuses, setStatuses] = useState<
    Record<number, FileWriteStatus>
  >({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [isWritingAll, setIsWritingAll] = useState(false);

  if (projectSource !== 'fsa') {
    return (
      <div className="mt-2 text-[11px] text-muted">
        {blocks.length} file{blocks.length === 1 ? '' : 's'} detected.
        Open a folder project to write{' '}
        {blocks.length === 1 ? 'it' : 'them'}
        {projectSource === 'zip'
          ? ' (ZIP projects are read-only).'
          : '.'}
      </div>
    );
  }

  async function writeOne(index: number): Promise<boolean> {
    const block = blocks[index];
    if (!block?.filename) {
      return false;
    }

    setStatuses((current) => ({
      ...current,
      [index]: 'writing',
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });

    try {
      const operation = await upsertFileInProject(
        block.filename,
        block.code,
      );
      setStatuses((current) => ({
        ...current,
        [index]: operation,
      }));
      return true;
    } catch (error) {
      setStatuses((current) => ({
        ...current,
        [index]: 'error',
      }));
      setErrors((current) => ({
        ...current,
        [index]:
          error instanceof Error
            ? error.message
            : 'Could not write file',
      }));
      return false;
    }
  }

  async function writeAll(): Promise<void> {
    setIsWritingAll(true);
    try {
      for (let index = 0; index < blocks.length; index += 1) {
        const status = statuses[index];
        if (status !== 'created' && status !== 'updated') {
          await writeOne(index);
        }
      }
    } finally {
      setIsWritingAll(false);
    }
  }

  const allDone =
    blocks.length > 0 &&
    blocks.every((_, index) => {
      const status = statuses[index];
      return status === 'created' || status === 'updated';
    });

  return (
    <div className="mt-2 flex w-full flex-col gap-1.5">
      {blocks.map((block, index) => {
        const status = statuses[index] ?? 'idle';
        const exists = [...fileHandles.keys()].some(
          (path) =>
            path.toLowerCase() === block.filename?.toLowerCase(),
        );

        return (
          <div
            className="flex min-w-0 items-center gap-2 text-[11px]"
            key={`${block.filename}-${index}`}
          >
            <FileCode className="shrink-0 text-muted" size={11} />
            <span
              className="min-w-0 flex-1 truncate font-mono text-foreground"
              title={block.filename ?? ''}
            >
              {block.filename}
            </span>
            <span className="shrink-0 text-muted">
              {block.lineCount} lines
            </span>

            {status === 'created' || status === 'updated' ? (
              <span className="shrink-0 text-success">
                {'\u2713'} {status === 'created' ? 'Created' : 'Updated'}
              </span>
            ) : (
              <button
                className="flex shrink-0 items-center gap-1 rounded border border-accent bg-surface-2 px-2 py-0.5 text-accent disabled:cursor-not-allowed disabled:opacity-60"
                disabled={status === 'writing' || isWritingAll}
                onClick={() => void writeOne(index)}
                title={errors[index]}
                type="button"
              >
                {status === 'writing' ? (
                  <Loader2 className="animate-spin" size={10} />
                ) : (
                  <FilePlus size={10} />
                )}
                {status === 'writing'
                  ? 'Writing'
                  : status === 'error'
                    ? 'Retry'
                    : exists
                      ? 'Update'
                      : 'Create'}
              </button>
            )}
          </div>
        );
      })}

      {blocks.length > 1 && !allDone ? (
        <button
          className="mt-1 flex items-center justify-center gap-1.5 rounded bg-accent px-2.5 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isWritingAll}
          onClick={() => void writeAll()}
          type="button"
        >
          {isWritingAll ? (
            <Loader2 className="animate-spin" size={11} />
          ) : (
            <FilePlus size={11} />
          )}
          {isWritingAll
            ? 'Writing files...'
            : `Create or Update All (${blocks.length})`}
        </button>
      ) : null}

      {allDone && blocks.length > 1 ? (
        <span className="text-[11px] text-success">
          {'\u2713'} All {blocks.length} files written
        </span>
      ) : null}
    </div>
  );
}

type DeleteStatus =
  | 'idle'
  | 'confirm'
  | 'deleting'
  | 'done'
  | 'error';

interface DeleteRequestActionsProps {
  requests: DeleteRequest[];
}

function DeleteRequestActions({
  requests,
}: DeleteRequestActionsProps) {
  const projectSource = useExplorerStore(
    (state) => state.projectSource,
  );
  const deleteEntryInProject = useExplorerStore(
    (state) => state.deleteEntryInProject,
  );
  const [statuses, setStatuses] = useState<
    Record<number, DeleteStatus>
  >({});
  const timersRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    },
    [],
  );

  if (projectSource !== 'fsa') {
    return null;
  }

  async function handleDelete(index: number): Promise<void> {
    const request = requests[index];
    if (!request) {
      return;
    }

    const currentStatus = statuses[index] ?? 'idle';
    if (currentStatus === 'idle' || currentStatus === 'error') {
      setStatuses((current) => ({
        ...current,
        [index]: 'confirm',
      }));
      const existingTimer = timersRef.current.get(index);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      timersRef.current.set(
        index,
        setTimeout(() => {
          setStatuses((current) =>
            current[index] === 'confirm'
              ? { ...current, [index]: 'idle' }
              : current,
          );
          timersRef.current.delete(index);
        }, 4_000),
      );
      return;
    }

    if (currentStatus !== 'confirm') {
      return;
    }

    const timer = timersRef.current.get(index);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(index);
    }
    setStatuses((current) => ({
      ...current,
      [index]: 'deleting',
    }));

    try {
      await deleteEntryInProject(
        request.path,
        request.isDirectory,
      );
      setStatuses((current) => ({
        ...current,
        [index]: 'done',
      }));
    } catch {
      setStatuses((current) => ({
        ...current,
        [index]: 'error',
      }));
    }
  }

  return (
    <div className="mt-2 flex w-full flex-col gap-1.5">
      {requests.map((request, index) => {
        const status = statuses[index] ?? 'idle';
        return (
          <div
            className="flex min-w-0 items-center gap-2 text-[11px]"
            key={`${request.isDirectory ? 'directory' : 'file'}-${request.path}`}
          >
            <Trash2 className="shrink-0 text-error" size={11} />
            <span className="min-w-0 flex-1 truncate font-mono text-foreground">
              {request.path}
              {request.isDirectory ? '/' : ''}
            </span>

            {status === 'done' ? (
              <span className="shrink-0 text-success">
                {'\u2713'} Deleted
              </span>
            ) : (
              <button
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded border border-error px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-60',
                  status === 'confirm'
                    ? 'bg-error text-white'
                    : 'bg-surface-2 text-error',
                )}
                disabled={status === 'deleting'}
                onClick={() => void handleDelete(index)}
                type="button"
              >
                {status === 'deleting' ? (
                  <Loader2 className="animate-spin" size={10} />
                ) : (
                  <Trash2 size={10} />
                )}
                {status === 'confirm'
                  ? 'Confirm delete?'
                  : status === 'deleting'
                    ? 'Deleting'
                    : status === 'error'
                      ? 'Retry'
                      : 'Delete'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
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
  const isAssistantDone =
    message.role === 'assistant' && !message.isStreaming;
  const detectedNamedBlocks = isAssistantDone
    ? getNamedFileBlocks(message.content)
    : [];
  const deleteRequests = isAssistantDone
    ? getDeleteRequests(message.content)
    : [];
  const activeFile =
    openFiles.find((file) => file.id === activeFileId) ?? null;
  const targetFile = message.targetFile
    ? (openFiles.find(
        (file) => file.id === message.targetFile?.id,
      ) ?? null)
    : activeFile;
  const isCreateOperation = message.fileOperation?.type === 'create';
  const singleNamedTarget =
    detectedNamedBlocks.length === 1 &&
    !isCreateOperation &&
    message.targetFile &&
    isSameFilePath(
      detectedNamedBlocks[0]?.filename,
      message.targetFile.id,
      message.targetFile.name,
    )
      ? detectedNamedBlocks[0]
      : null;
  const namedFileBlocks = singleNamedTarget
    ? []
    : detectedNamedBlocks;
  const fallbackBlock = singleNamedTarget
    ? {
        ...singleNamedTarget,
        isLikelyFileContent: true,
      }
    : isAssistantDone && namedFileBlocks.length === 0
      ? getLargestFileBlock(message.content)
      : null;

  function handleApplyToFile(): void {
    if (!fallbackBlock || !targetFile || targetFile.isReadOnly) {
      return;
    }

    const codeLanguage = toMonacoLanguage(fallbackBlock.language);
    openDiff({
      fileId: targetFile.id,
      fileName: targetFile.name,
      language:
        codeLanguage === 'plaintext'
          ? targetFile.language
          : codeLanguage,
      originalContent: targetFile.content,
      modifiedContent: fallbackBlock.code,
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
      {namedFileBlocks.length > 0 ? (
        <MultiFileActions blocks={namedFileBlocks} />
      ) : null}
      {fallbackBlock ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isCreateOperation ? (
              <span className="text-[11px] text-muted">
                New file: {message.fileOperation?.path ?? 'auto-detect'}
              </span>
            ) : targetFile ? (
              <button
                className="flex items-center gap-1.5 rounded border border-accent bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-[rgba(47,129,247,0.15)] disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
                disabled={targetFile.isReadOnly}
                onClick={handleApplyToFile}
                type="button"
              >
                <Zap size={11} />
                {targetFile.isReadOnly
                  ? `${targetFile.name} is read-only`
                  : `Apply to ${targetFile.name}`}
              </button>
            ) : message.targetFile ? (
              <span className="text-[11px] text-muted">
                Reopen {message.targetFile.name} to apply changes
              </span>
            ) : (
              <span className="text-[11px] text-muted">
                Open a file to apply changes
              </span>
            )}

            <CreateFileButton
              code={fallbackBlock.code}
              language={fallbackBlock.language}
              suggestedPath={message.fileOperation?.path}
            />

            <span className="ml-auto text-[11px] text-muted">
              {fallbackBlock.lineCount} lines
            </span>
          </div>
        </div>
      ) : null}
      {deleteRequests.length > 0 ? (
        <DeleteRequestActions requests={deleteRequests} />
      ) : null}
      <span className="mt-1 px-1 text-[10px] text-muted">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}

function isSameFilePath(
  detectedPath: string | null | undefined,
  targetId: string,
  targetName: string,
): boolean {
  if (!detectedPath) {
    return false;
  }

  const normalized = detectedPath.toLowerCase();
  return (
    normalized === targetId.toLowerCase() ||
    normalized === targetName.toLowerCase()
  );
}
