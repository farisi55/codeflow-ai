'use client';

import { ChevronDown, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { MOCK_PROVIDERS } from '@/mock/providers';
import { useAIStore } from '@/stores/ai.store';
import type { ProviderModelInfo } from '@/types/api.types';

function formatContextLength(contextLength?: number): string | null {
  if (!contextLength) {
    return null;
  }
  if (contextLength >= 1_000_000) {
    return `${(contextLength / 1_000_000).toFixed(
      contextLength % 1_000_000 === 0 ? 0 : 1,
    )}M ctx`;
  }
  if (contextLength >= 1000) {
    return `${Math.round(contextLength / 1000)}K ctx`;
  }
  return `${contextLength} ctx`;
}

function getModelLabel(model: ProviderModelInfo): string {
  const details = [
    model.isFree ? 'FREE' : null,
    formatContextLength(model.contextLength),
  ].filter(Boolean);
  const identity =
    model.name && model.name !== model.id
      ? `${model.name} (${model.id})`
      : model.id;

  return details.length > 0
    ? `${details.join(' · ')} · ${identity}`
    : identity;
}

export function ModelSelector() {
  const selectedProvider = useAIStore((state) => state.selectedProvider);
  const selectedModel = useAIStore((state) => state.selectedModel);
  const providerCatalog = useAIStore((state) => state.providerCatalog);
  const isCatalogLoading = useAIStore(
    (state) => state.isCatalogLoading,
  );
  const setModel = useAIStore((state) => state.setModel);
  const refreshProviderCatalog = useAIStore(
    (state) => state.refreshProviderCatalog,
  );
  const liveProvider = providerCatalog.find(
    (provider) => provider.id === selectedProvider,
  );
  const fallbackProvider =
    MOCK_PROVIDERS.find((candidate) => candidate.id === selectedProvider) ??
    MOCK_PROVIDERS[0];
  const providerModels: ProviderModelInfo[] =
    liveProvider?.models ??
    fallbackProvider.models.map((id) => ({ id, name: id }));
  const models =
    selectedProvider === 'auto'
      ? [{ id: 'Auto', name: 'Auto' }]
      : [{ id: 'Auto', name: 'Auto' }, ...providerModels];
  const selectValue = models.some((model) => model.id === selectedModel)
    ? selectedModel
    : 'Auto';
  const modelCount =
    selectedProvider === 'auto' ? null : providerModels.length;

  useEffect(() => {
    if (selectValue === 'Auto' && selectedModel !== 'Auto') {
      setModel('Auto');
    }
  }, [selectValue, selectedModel, setModel]);

  return (
    <div className="flex items-end gap-1">
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] leading-none text-muted">
          Model
          {modelCount === null ? '' : ` (${modelCount})`}
        </span>
        <span className="relative">
          <select
            aria-label="AI model"
            className="h-6 max-w-64 appearance-none rounded-md border border-border bg-surface-2 py-0.5 pl-2 pr-7 text-xs text-foreground outline-none transition-colors hover:border-muted focus:border-accent"
            onChange={(event) => setModel(event.target.value)}
            title={
              liveProvider
                ? `${liveProvider.source} catalog, updated ${new Date(
                    liveProvider.updatedAt,
                  ).toLocaleTimeString()}`
                : 'Fallback model catalog'
            }
            value={selectValue}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {getModelLabel(model)}
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
      <button
        aria-label="Refresh available AI models"
        className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted transition-colors hover:border-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isCatalogLoading}
        onClick={() => void refreshProviderCatalog(true)}
        title="Refresh model catalogs from providers"
        type="button"
      >
        <RefreshCw
          className={isCatalogLoading ? 'animate-spin' : undefined}
          size={12}
        />
      </button>
    </div>
  );
}
