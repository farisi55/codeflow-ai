import {
  FALLBACK_CHAIN,
  PROVIDER_PRIORITY_ORDER,
  TASK_PROVIDER_MAP,
} from '@codeflow/shared';
import { registerAs } from '@nestjs/config';

export const aiProvidersConfig = registerAs('aiProviders', () => ({
  credentials: {
    gemini: process.env.GEMINI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    ollama: process.env.OLLAMA_BASE_URL,
    opencode: process.env.OPENCODE_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    puter: process.env.PUTER_API_KEY,
    sambanova: process.env.SAMBANOVA_API_KEY,
    zai: process.env.ZAI_API_KEY,
  },
  fallbackChain: FALLBACK_CHAIN,
  priorityOrder: PROVIDER_PRIORITY_ORDER,
  taskRouting: TASK_PROVIDER_MAP,
}));
