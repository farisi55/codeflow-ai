'use client';

import { ChevronDown } from 'lucide-react';

import { MOCK_PROVIDERS } from '@/mock/providers';
import { useAIStore } from '@/stores/ai.store';

export function ModelSelector() {
  const selectedProvider = useAIStore((state) => state.selectedProvider);
  const selectedModel = useAIStore((state) => state.selectedModel);
  const setModel = useAIStore((state) => state.setModel);
  const provider =
    MOCK_PROVIDERS.find((candidate) => candidate.id === selectedProvider) ??
    MOCK_PROVIDERS[0];
  const models =
    selectedProvider === 'auto' ? ['Auto'] : ['Auto', ...provider.models];
  const selectValue = models.includes(selectedModel)
    ? selectedModel
    : models[0];

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] leading-none text-muted">Model</span>
      <span className="relative">
        <select
          aria-label="AI model"
          className="h-6 max-w-48 appearance-none rounded-md border border-border bg-surface-2 py-0.5 pl-2 pr-7 text-xs text-foreground outline-none transition-colors hover:border-muted focus:border-accent"
          onChange={(event) => setModel(event.target.value)}
          value={selectValue}
        >
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
          size={12}
        />
      </span>
    </label>
  );
}
