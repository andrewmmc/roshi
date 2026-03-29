import type { ProviderConfig } from '@/types/provider';
import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '@/constants/defaults';

export const builtinProviders: Omit<ProviderConfig, 'id' | 'apiKey'>[] = [
  {
    name: 'OpenAI',
    type: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    auth: { type: 'bearer' },
    endpoints: { chat: '/chat/completions' },
    models: [],
    defaults: {
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
    },
    isBuiltIn: true,
  },
  // TODO: Re-enable Anthropic provider once adapter is implemented
  // {
  //   name: 'Anthropic',
  //   type: 'anthropic',
  //   baseUrl: 'https://api.anthropic.com/v1',
  //   auth: { type: 'api-key-header', headerName: 'x-api-key' },
  //   endpoints: { chat: '/messages' },
  //   models: [],
  //   defaults: { temperature: 1, maxTokens: 4096 },
  //   isBuiltIn: true,
  // },
  {
    name: 'OpenRouter',
    type: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    auth: { type: 'bearer' },
    endpoints: { chat: '/chat/completions' },
    models: [],
    defaults: {
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
    },
    isBuiltIn: true,
  },
];
