import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import { resolveProviderProtocol } from '@/types/provider';
import { openaiChatAdapter } from './openai-chat';
import { openaiResponsesAdapter } from './openai-responses';
import { anthropicAdapter } from './anthropic';
import { geminiAdapter } from './gemini';
import { isOpenAIGpt5Family } from '@/models/model-families';

function shouldUseResponsesForModel(
  provider: ProviderConfig,
  model: string,
): boolean {
  return (
    provider.name === 'OpenAI' &&
    provider.type === 'openai-compatible' &&
    isOpenAIGpt5Family(model)
  );
}

export function getAdapter(
  provider: ProviderConfig,
  model?: string,
): ProviderAdapter {
  if (model && shouldUseResponsesForModel(provider, model)) {
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
      return openaiChatAdapter;
  }
}
