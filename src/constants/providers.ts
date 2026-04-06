import type { ProviderConfig } from '@/types/provider';
import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '@/constants/defaults';

/** User-added providers (`isBuiltIn: false`); enforced in `provider-store.addProvider`. */
export const MAX_CUSTOM_PROVIDERS = 3;

export function createCustomProviderTemplate(): Omit<ProviderConfig, 'id'> {
  return {
    name: '',
    type: 'custom',
    baseUrl: '',
    auth: { type: 'bearer' },
    apiKey: '',
    endpoints: { chat: '/chat/completions' },
    models: [
      {
        id: '',
        name: '',
        displayName: '',
        supportsStreaming: true,
      },
    ],
    defaults: {
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
    },
    isBuiltIn: false,
    customHeaders: {},
  };
}
