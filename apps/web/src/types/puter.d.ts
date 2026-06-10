declare global {
  interface PuterAIStreamChunk {
    text?: string;
    type?: string;
  }

  interface PuterAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  interface PuterAIChatOptions {
    model?: string;
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
  }

  interface PuterAIModel {
    id: string;
    provider: string;
    name?: string;
    aliases?: string[];
    context?: number;
    max_tokens?: number;
  }

  interface PuterAI {
    chat(
      prompt: string | PuterAIMessage[],
      options?: PuterAIChatOptions,
    ): Promise<string | AsyncIterable<PuterAIStreamChunk>>;

    listModels(provider?: string | null): Promise<PuterAIModel[]>;
  }

  interface PuterUser {
    username: string;
    email?: string;
  }

  interface PuterAuth {
    isSignedIn(): boolean;
    signIn(): Promise<unknown>;
    signOut(): Promise<void>;
    getUser(): Promise<PuterUser>;
  }

  interface Puter {
    auth: PuterAuth;
    ai: PuterAI;
  }

  interface Window {
    puter?: Puter;
  }
}

export {};
