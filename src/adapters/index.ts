import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import { openaiAdapter } from './openai';

export function getAdapter(provider: ProviderConfig): ProviderAdapter {
  switch (provider.type) {
    case 'openai-compatible':
    case 'custom':
      return openaiAdapter;
    case 'anthropic':
    case 'google-gemini':
      // Future adapters — fall back to OpenAI-compatible for now
      return openaiAdapter;
    default:
      return openaiAdapter;
  }
}
