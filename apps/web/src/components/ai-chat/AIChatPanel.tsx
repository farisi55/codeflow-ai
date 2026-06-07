'use client';

import {
  Loader2,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useAIStore } from '@/stores/ai.store';

import { ChatMessage } from './ChatMessage';

export function AIChatPanel() {
  const messages = useAIStore((state) => state.messages);
  const isLoading = useAIStore((state) => state.isLoading);
  const sendMessage = useAIStore((state) => state.sendMessage);
  const clearMessages = useAIStore((state) => state.clearMessages);
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    void sendMessage(input);
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
