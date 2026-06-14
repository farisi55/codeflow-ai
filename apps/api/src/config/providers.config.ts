import { registerAs } from '@nestjs/config';

export const providersConfig = registerAs('providers', () => ({
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel:
      process.env.GROQ_DEFAULT_MODEL ?? 'llama-3.3-70b-versatile',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    defaultModel:
      process.env.GEMINI_DEFAULT_MODEL ?? 'gemini-2.0-flash',
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY ?? '',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel:
      process.env.MISTRAL_DEFAULT_MODEL ?? 'mistral-large-latest',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel:
      process.env.OPENROUTER_DEFAULT_MODEL ?? 'openrouter/free',
    siteUrl: 'http://localhost:3000',
    siteName: 'CodeFlow AI',
  },
  sambanova: {
    apiKey: process.env.SAMBANOVA_API_KEY ?? '',
    baseUrl:
      process.env.SAMBANOVA_BASE_URL ?? 'https://api.sambanova.ai/v1',
    defaultModel:
      process.env.SAMBANOVA_DEFAULT_MODEL ??
      'Meta-Llama-3.3-70B-Instruct',
  },
  zai: {
    apiKey: process.env.ZAI_API_KEY ?? '',
    baseUrl:
      process.env.ZAI_BASE_URL ?? 'https://api.z.ai/api/paas/v4',
    defaultModel: process.env.ZAI_DEFAULT_MODEL ?? 'glm-5.1',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL ?? 'llama3.2',
  },
  webSearch: {
    tavily: {
      apiKey: process.env.TAVILY_API_KEY ?? '',
    },
    firecrawl: {
      apiKey: process.env.FIRECRAWL_API_KEY ?? '',
    },
  },
}));
