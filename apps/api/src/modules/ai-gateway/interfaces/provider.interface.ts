export interface ProviderModel {
  id: string;
  name: string;
  isFree?: boolean;
  contextLength?: number;
  ownedBy?: string;
}

export interface ProviderCatalogEntry {
  id: string;
  name: string;
  available: boolean;
  isLocal: boolean;
  defaultModel: string;
  source: 'live' | 'fallback';
  models: ProviderModel[];
  updatedAt: string;
}

export interface IProvider {
  readonly id: string;
  readonly name: string;
  readonly models: string[];
  readonly supportsDynamicModels: boolean;

  isAvailable(): boolean;
  getDefaultModel(): string;
  getFallbackModels(): string[];
  listModels(): Promise<ProviderModel[]>;

  stream(
    messages: ProviderMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown>;
}

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
