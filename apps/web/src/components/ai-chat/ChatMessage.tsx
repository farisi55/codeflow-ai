'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageData } from '@/stores/ai.store';

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
      <span className="mt-1 px-1 text-[10px] text-muted">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
