'use client';

import { ChevronDown } from 'lucide-react';

import { MOCK_PROVIDERS } from '@/mock/providers';
import { useAIStore } from '@/stores/ai.store';

export function ProviderSelector() {
  const selectedProvider = useAIStore((state) => state.selectedProvider);
  const setProvider = useAIStore((state) => state.setProvider);
  const setModel = useAIStore((state) => state.setModel);

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] leading-none text-muted">Provider</span>
      <span className="relative">
        <select
          aria-label="AI provider"
          className="h-6 min-w-28 appearance-none rounded-md border border-border bg-surface-2 py-0.5 pl-2 pr-7 text-xs text-foreground outline-none transition-colors hover:border-muted focus:border-accent"
          onChange={(event) => {
            setProvider(event.target.value);
            setModel('Auto');
          }}
          value={selectedProvider}
        >
          {MOCK_PROVIDERS.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
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
