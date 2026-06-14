export interface ProviderOption {
  id: string;
  name: string;
  models: string[];
  isLocal?: boolean;
}

export const MOCK_PROVIDERS: ProviderOption[] = [
  { id: 'auto', name: 'Auto', models: ['Auto'] },
  {
    id: 'cloudflare',
    name: 'Cloudflare AI',
    models: [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/meta/llama-3.1-70b-instruct',
      '@cf/mistral/mistral-7b-instruct-v0.2-lora',
      '@cf/qwen/qwen1.5-14b-chat-awq',
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    ],
  },
  {
    id: 'github',
    name: 'GitHub Models',
    models: [
      'openai/gpt-4.1-mini',
      'openai/gpt-4.1',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'microsoft/phi-4',
      'meta/llama-3.3-70b-instruct',
      'mistral-ai/mistral-large-2411',
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
