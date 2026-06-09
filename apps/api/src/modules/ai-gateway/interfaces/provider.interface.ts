export interface IProvider {
  readonly id: string;
  readonly name: string;
  readonly models: string[];

  isAvailable(): boolean;

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
