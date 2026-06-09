import { registerAs } from '@nestjs/config';

export const providersConfig = registerAs('providers', () => ({
  puter: {
    apiKey: process.env.PUTER_API_KEY ?? '',
    baseUrl: 'https://api.puter.com',
    defaultModel: 'gpt-4o',
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    defaultModel: 'gemini-2.0-flash',
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY ?? '',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'auto',
    siteUrl: 'http://localhost:3000',
    siteName: 'CodeFlow AI',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL ?? 'llama3.2',
  },
}));
