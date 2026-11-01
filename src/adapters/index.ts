import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import { resolveProviderProtocol } from '@/types/provider';
import { openaiAdapter } from './openai';
import { openaiResponsesAdapter } from './openai-responses';
import { anthropicAdapter } from './anthropic';
import { geminiAdapter } from './gemini';
import { usesOpenAIResponsesApi } from '@/models/model-families';

export function getAdapter(
  provider: ProviderConfig,
  model?: string,
): ProviderAdapter {
  if (model && usesOpenAIResponsesApi(provider, model)) {
    return openaiResponsesAdapter;
  }

  switch (resolveProviderProtocol(provider)) {
    case 'openai-responses':
      return openaiResponsesAdapter;
    case 'anthropic-messages':
      return anthropicAdapter;
    case 'gemini-generate-content':
      return geminiAdapter;
    case 'openai-chat-completions':
    case 'openai-compatible-chat':
    default:
      return openaiAdapter;
  }
}
