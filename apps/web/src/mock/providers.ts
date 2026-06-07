export interface ProviderOption {
  id: string;
  name: string;
  models: string[];
  isLocal?: boolean;
}

export const MOCK_PROVIDERS: ProviderOption[] = [
  { id: 'auto', name: 'Auto', models: ['Auto'] },
  {
    id: 'puter',
    name: 'Puter AI',
    models: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash'],
  },
  {
    id: 'groq',
    name: 'Groq',
    models: [
      'llama-3.3-70b-versatile',
      'gemma2-9b-it',
      'mixtral-8x7b',
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    models: [
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    models: [
      'mistral-large-latest',
      'codestral-latest',
      'mistral-small',
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      'auto',
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-coder',
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    models: [
      'llama3.2',
      'qwen2.5-coder',
      'codellama',
      'deepseek-coder-v2',
    ],
    isLocal: true,
  },
];
