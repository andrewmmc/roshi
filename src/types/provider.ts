export interface ProviderModel {
  id: string;
  name: string;
  displayName: string;
  maxTokens?: number;
  supportsStreaming: boolean;
}

export type ProviderType = 'openai-compatible' | 'anthropic' | 'google-gemini';

export type ProviderProtocol =
  | 'openai-chat-completions'
  | 'openai-responses'
  | 'openai-compatible-chat'
  | 'anthropic-messages'
  | 'gemini-generate-content';

/** Whether the provider type supports user-managed model lists */
export function supportsModelSelection(type: ProviderType): boolean {
  return type !== 'google-gemini';
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  protocol?: ProviderProtocol;
  baseUrl: string;
  auth: {
    type: 'bearer' | 'api-key-header' | 'query-param' | 'none';
    headerName?: string;
  };
  apiKey: string;
  endpoints: { chat: string; responses?: string };
  models: ProviderModel[];
  defaults?: { temperature?: number; maxTokens?: number };
  isBuiltIn: boolean;
  customHeaders?: Record<string, string>;
}

export function getDefaultProtocolForProviderType(
  type: ProviderType,
  providerName?: string,
): ProviderProtocol {
  switch (type) {
    case 'anthropic':
      return 'anthropic-messages';
    case 'google-gemini':
      return 'gemini-generate-content';
    case 'openai-compatible':
      return providerName === 'OpenAI'
        ? 'openai-chat-completions'
        : 'openai-compatible-chat';
  }
}

export function resolveProviderProtocol(
  provider: ProviderConfig,
): ProviderProtocol {
  if (provider.type === 'anthropic') return 'anthropic-messages';
  if (provider.type === 'google-gemini') return 'gemini-generate-content';

  if (
    provider.protocol === 'openai-chat-completions' ||
    provider.protocol === 'openai-responses' ||
    provider.protocol === 'openai-compatible-chat'
  ) {
    return provider.protocol;
  }

  return getDefaultProtocolForProviderType(provider.type, provider.name);
}
