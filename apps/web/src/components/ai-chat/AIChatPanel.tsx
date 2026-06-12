'use client';

import {
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  Undo2,
  X as XIcon,
} from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  getAutoApplyFileBlock,
  getLargestFileBlock,
  getNamedFileBlocks,
} from '@/lib/diff-utils';
import {
  detectCreateFileIntent,
  suggestFilename,
  validateFilename,
} from '@/lib/file-intent-utils';
import { useAIStore } from '@/stores/ai.store';
import { useEditorStore } from '@/stores/editor.store';
import { useExplorerStore } from '@/stores/explorer.store';
import { useSettingsStore } from '@/stores/settings.store';

import { ChatMessage } from './ChatMessage';
import { OpenCodeStatusBanner } from './OpenCodeStatusBanner';
import { PuterAuthBanner } from './PuterAuthBanner';

interface Notification {
  type: 'success' | 'error';
  message: string;
  canUndo: boolean;
}

interface UndoSnapshot {
  fileId: string;
  fileName: string;
  previousContent: string;
  wasDirty: boolean;
}

export function AIChatPanel() {
  const messages = useAIStore((state) => state.messages);
  const isLoading = useAIStore((state) => state.isLoading);
  const sendMessage = useAIStore((state) => state.sendMessage);
  const clearMessages = useAIStore((state) => state.clearMessages);
  const selectedProvider = useAIStore(
    (state) => state.selectedProvider,
  );
  const autoApply = useSettingsStore((state) => state.autoApply);
  const openCodeEnabled = useSettingsStore(
    (state) => state.openCodeEnabled,
  );
  const isSaving = useEditorStore((state) => state.isSaving);
  const [input, setInput] = useState('');
  const [notification, setNotification] =
    useState<Notification | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const appliedIds = useRef<Set<string>>(new Set());
  const undoSnapshot = useRef<UndoSnapshot | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!autoApply) {
      return;
    }

    const lastMessage = messages.at(-1);
    if (
      !lastMessage ||
      lastMessage.role !== 'assistant' ||
      lastMessage.isStreaming ||
      !lastMessage.autoApplyRequested ||
      appliedIds.current.has(lastMessage.id)
    ) {
      return;
    }

    if (lastMessage.isMockResponse) {
      appliedIds.current.add(lastMessage.id);
      setNotification({
        type: 'error',
        message:
          'Auto-Apply skipped - provider failed and the displayed response is only a mock fallback',
        canUndo: false,
      });
      return;
    }

    const isCreateOperation =
      lastMessage.fileOperation?.type === 'create';
    const detectedNamedBlocks = getNamedFileBlocks(
      lastMessage.content,
    );
    const singleNamedTarget =
      detectedNamedBlocks.length === 1 &&
      !isCreateOperation &&
      lastMessage.targetFile &&
      isSameFilePath(
        detectedNamedBlocks[0]?.filename,
        lastMessage.targetFile.id,
        lastMessage.targetFile.name,
      )
        ? detectedNamedBlocks[0]
        : null;
    const namedFileBlocks = singleNamedTarget
      ? []
      : detectedNamedBlocks;
    const codeBlock =
      namedFileBlocks.length > 0
        ? null
        : singleNamedTarget
          ? {
              ...singleNamedTarget,
              isLikelyFileContent: true,
            }
          : isCreateOperation
            ? getAutoApplyFileBlock(lastMessage.content)
            : lastMessage.targetFile
              ? getAutoApplyFileBlock(
                  lastMessage.content,
                  lastMessage.targetFile.language,
                )
              : getLargestFileBlock(lastMessage.content);
    if (namedFileBlocks.length === 0 && !codeBlock) {
      appliedIds.current.add(lastMessage.id);
      setNotification({
        type: 'error',
        message: lastMessage.fileOperation?.multiple
          ? 'Auto-Apply skipped - AI did not return named file blocks'
          : isCreateOperation
            ? 'Auto-Apply skipped - AI did not return exactly one complete new file'
            : lastMessage.targetFile
              ? `Auto-Apply skipped - AI did not return one complete ${lastMessage.targetFile.name} code block`
              : 'Auto-Apply skipped - AI did not return a complete file',
        canUndo: false,
      });
      return;
    }

    appliedIds.current.add(lastMessage.id);

    void (async () => {
      try {
        const explorerStore = useExplorerStore.getState();
        if (explorerStore.projectSource !== 'fsa') {
          setNotification({
            type: 'error',
            message:
              explorerStore.projectSource === 'zip'
                ? 'Auto-Apply skipped - ZIP projects are read-only'
                : 'Auto-Apply skipped - open a folder project first',
            canUndo: false,
          });
          appliedIds.current.delete(lastMessage.id);
          return;
        }

        if (namedFileBlocks.length > 0) {
          let createdCount = 0;
          let updatedCount = 0;
          let failedCount = 0;

          for (const block of namedFileBlocks) {
            if (!block.filename) {
              failedCount += 1;
              continue;
            }

            try {
              const operation =
                await explorerStore.upsertFileInProject(
                  block.filename,
                  block.code,
                );
              if (operation === 'created') {
                createdCount += 1;
              } else {
                updatedCount += 1;
              }
            } catch {
              failedCount += 1;
            }
          }

          const successCount = createdCount + updatedCount;
          setNotification({
            type: successCount > 0 ? 'success' : 'error',
            message:
              failedCount === 0
                ? `Wrote ${successCount} file${
                    successCount === 1 ? '' : 's'
                  } (${createdCount} created, ${updatedCount} updated)`
                : `Wrote ${successCount}/${namedFileBlocks.length} files; ${failedCount} failed`,
            canUndo: false,
          });
          return;
        }

        if (!codeBlock) {
          throw new Error(
            'Auto-Apply skipped - no complete file was returned',
          );
        }

        if (isCreateOperation) {
          const filename =
            lastMessage.fileOperation?.path ??
            suggestFilename(codeBlock.language);
          const validationError = validateFilename(filename);
          if (validationError) {
            throw new Error(
              `Auto-Apply skipped - invalid new file path: ${validationError}`,
            );
          }

          undoSnapshot.current = null;
          await explorerStore.createFileInProject(
            filename,
            codeBlock.code,
          );
          setNotification({
            type: 'success',
            message: `Created ${filename}`,
            canUndo: false,
          });
          return;
        }

        const editorStore = useEditorStore.getState();
        const targetFile = lastMessage.targetFile;
        let activeFile = targetFile
          ? (editorStore.openFiles.find(
              (file) => file.id === targetFile.id,
            ) ?? null)
          : (editorStore.openFiles.find(
              (file) => file.id === editorStore.activeFileId,
            ) ?? null);

        if (targetFile && !activeFile) {
          await explorerStore.openFileInEditor(targetFile.id);
          activeFile =
            useEditorStore
              .getState()
              .openFiles.find((file) => file.id === targetFile.id) ??
            null;
        }

        if (targetFile && !activeFile) {
          throw new Error(
            `Auto-Apply skipped - ${targetFile.name} is no longer available`,
          );
        }

        if (activeFile) {
          if (activeFile.isReadOnly) {
            throw new Error(
              `Auto-Apply skipped - ${activeFile.name} is read-only`,
            );
          }

          if (
            targetFile &&
            activeFile.content !== targetFile.content
          ) {
            throw new Error(
              `Auto-Apply skipped - ${activeFile.name} changed while AI was responding`,
            );
          }

          undoSnapshot.current = {
            fileId: activeFile.id,
            fileName: activeFile.name,
            previousContent: activeFile.content,
            wasDirty: activeFile.isDirty,
          };

          editorStore.updateContent(activeFile.id, codeBlock.code);
          await editorStore.saveFile(activeFile.id);

          const updatedFile = useEditorStore
            .getState()
            .openFiles.find((file) => file.id === activeFile.id);
          if (updatedFile?.isDirty) {
            throw new Error(
              useExplorerStore.getState().error ??
                `Could not save ${activeFile.name}`,
            );
          }

          setNotification({
            type: 'success',
            message: `Applied to ${activeFile.name}`,
            canUndo: true,
          });
          return;
        }

        const filename = suggestFilename(codeBlock.language);
        undoSnapshot.current = null;
        await explorerStore.createFileInProject(
          filename,
          codeBlock.code,
        );
        setNotification({
          type: 'success',
          message: `Created ${filename}`,
          canUndo: false,
        });
      } catch (error) {
        const failedSnapshot = undoSnapshot.current;
        if (failedSnapshot) {
          const editorStore = useEditorStore.getState();
          const targetStillOpen = editorStore.openFiles.some(
            (file) => file.id === failedSnapshot.fileId,
          );
          if (targetStillOpen) {
            editorStore.updateContent(
              failedSnapshot.fileId,
              failedSnapshot.previousContent,
            );
            if (!failedSnapshot.wasDirty) {
              editorStore.markClean(failedSnapshot.fileId);
            }
          }
        }
        undoSnapshot.current = null;
        setNotification({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Auto-Apply failed',
          canUndo: false,
        });
        appliedIds.current.delete(lastMessage.id);
      }
    })();
  }, [messages, autoApply]);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotification(null);
      undoSnapshot.current = null;
    }, 8_000);

    return () => window.clearTimeout(timer);
  }, [notification]);

  async function handleUndo(): Promise<void> {
    const snapshot = undoSnapshot.current;
    if (!snapshot || isSaving) {
      return;
    }

    try {
      const explorerStore = useExplorerStore.getState();
      const editorStore = useEditorStore.getState();
      let targetFile = editorStore.openFiles.find(
        (file) => file.id === snapshot.fileId,
      );

      if (!targetFile) {
        await explorerStore.openFileInEditor(snapshot.fileId);
        targetFile = useEditorStore
          .getState()
          .openFiles.find((file) => file.id === snapshot.fileId);
      }

      if (!targetFile || targetFile.isReadOnly) {
        throw new Error('Undo target is unavailable');
      }

      const currentEditorStore = useEditorStore.getState();
      currentEditorStore.setActiveFile(snapshot.fileId);
      currentEditorStore.updateContent(
        snapshot.fileId,
        snapshot.previousContent,
      );
      await currentEditorStore.saveActiveFile();

      const revertedFile = useEditorStore
        .getState()
        .openFiles.find((file) => file.id === snapshot.fileId);
      if (revertedFile?.isDirty) {
        throw new Error('Undo write failed');
      }

      undoSnapshot.current = null;
      setNotification({
        type: 'success',
        message: `Reverted ${snapshot.fileName}`,
        canUndo: false,
      });
    } catch {
      setNotification({
        type: 'error',
        message: 'Undo failed - please revert manually',
        canUndo: false,
      });
    }
  }

  function resizeTextarea(element: HTMLTextAreaElement): void {
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setInput(event.target.value);
    resizeTextarea(event.target);
  }

  function submitMessage(): void {
    if (!input.trim() || isLoading) {
      return;
    }

    const editorStore = useEditorStore.getState();
    const activeFile =
      editorStore.openFiles.find(
        (file) => file.id === editorStore.activeFileId,
      ) ?? undefined;

    const fileOperation = detectCreateFileIntent(input);

    void sendMessage(input, {
      autoApply,
      fileOperation: fileOperation ?? undefined,
      activeFile: activeFile
        ? {
            id: activeFile.id,
            name: activeFile.name,
            language: activeFile.language,
            content: activeFile.content,
          }
        : undefined,
    });
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  return (
    <aside
      aria-label="AI assistant"
      className="flex h-full min-h-0 flex-col bg-surface"
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
          AI Assistant
        </h2>
        <button
          aria-label="Clear conversation"
          className="rounded p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-error"
          onClick={clearMessages}
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {openCodeEnabled ? <OpenCodeStatusBanner /> : null}

      {!openCodeEnabled &&
      (selectedProvider === 'puter' || selectedProvider === 'auto') ? (
        <PuterAuthBanner alwaysShow={selectedProvider === 'puter'} />
      ) : null}

      {notification ? (
        <div
          className={
            notification.type === 'success'
              ? 'flex shrink-0 items-center gap-2 border-b border-border bg-[rgba(63,185,80,0.08)] px-3 py-2 text-[11px]'
              : 'flex shrink-0 items-center gap-2 border-b border-border bg-[rgba(248,81,73,0.08)] px-3 py-2 text-[11px]'
          }
        >
          {notification.type === 'success' ? (
            <CheckCircle className="shrink-0 text-success" size={12} />
          ) : (
            <AlertCircle className="shrink-0 text-error" size={12} />
          )}
          <span
            className={
              notification.type === 'success'
                ? 'min-w-0 flex-1 truncate text-success'
                : 'min-w-0 flex-1 truncate text-error'
            }
          >
            {notification.message}
          </span>
          {notification.canUndo ? (
            <button
              className="flex shrink-0 items-center gap-1 rounded border border-accent px-1.5 py-0.5 text-[10px] font-medium text-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void handleUndo()}
              type="button"
            >
              <Undo2 size={9} />
              Undo
            </button>
          ) : null}
          <button
            aria-label="Dismiss notification"
            className="shrink-0 p-0.5 text-muted hover:text-foreground"
            onClick={() => {
              setNotification(null);
              undoSnapshot.current = null;
            }}
            type="button"
          >
            <XIcon size={11} />
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
            <MessageSquare size={32} strokeWidth={1.4} />
            <p className="text-xs">Start a conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="shrink-0 border-t border-border p-3"
        onSubmit={handleSubmit}
      >
        <div className="relative">
          <textarea
            aria-label="Message AI assistant"
            className="block max-h-[120px] min-h-16 w-full resize-none overflow-y-auto rounded-lg border border-border bg-surface-2 p-2 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the code..."
            ref={textareaRef}
            rows={2}
            value={input}
          />
          <button
            aria-label="Send message"
            className="absolute bottom-2 right-2 rounded-md p-1.5 text-accent transition-colors hover:bg-[rgba(47,129,247,0.15)] hover:text-accent-hover disabled:cursor-not-allowed disabled:text-muted"
            disabled={isLoading || !input.trim()}
            type="submit"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted">
          Enter to send, Shift + Enter for a new line
        </p>
      </form>
    </aside>
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
