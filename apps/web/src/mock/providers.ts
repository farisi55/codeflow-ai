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
    name: 'Puter AI (User-Pays)',
    models: [
      'gpt-5.4-nano',
      'openai/gpt-5.4-nano',
      'google/gemini-3.5-flash',
      'google/gemini-3.1-pro-preview',
      'gemini-2.5-flash-lite',
      'claude-sonnet',
      'meta-llama/llama-3.3-70b-instruct',
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'groq/compound',
      'groq/compound-mini',
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
    models: ['openrouter/free', 'openrouter/auto'],
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    models: [
      'Meta-Llama-3.3-70B-Instruct',
      'DeepSeek-V3.1',
      'MiniMax-M2.7',
      'gpt-oss-120b',
    ],
  },
  {
    id: 'zai',
    name: 'Z.AI',
    models: [
      'glm-5.1',
      'glm-5',
      'glm-5-turbo',
      'glm-4.7',
      'glm-4.6',
      'glm-4.5',
      'glm-4-32B-0414-128K',
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
