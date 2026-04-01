import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import { openaiAdapter } from './openai';
import { anthropicAdapter } from './anthropic';
import { geminiAdapter } from './gemini';

export function getAdapter(provider: ProviderConfig): ProviderAdapter {
  switch (provider.type) {
    case 'openai-compatible':
    case 'custom':
      return openaiAdapter;
    case 'anthropic':
      return anthropicAdapter;
    case 'google-gemini':
      return geminiAdapter;
    default:
      return openaiAdapter;
  }
}
