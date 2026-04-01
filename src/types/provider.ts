export interface ProviderModel {
  id: string;
  name: string;
  displayName: string;
  maxTokens?: number;
  supportsStreaming: boolean;
}

export type ProviderType =
  | 'openai-compatible'
  | 'anthropic'
  | 'google-gemini'
  | 'custom';

/** Whether the provider type supports user-managed model lists */
export function supportsModelSelection(type: ProviderType): boolean {
  return type !== 'google-gemini';
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  auth: {
    type: 'bearer' | 'api-key-header' | 'query-param' | 'none';
    headerName?: string;
  };
  apiKey: string;
  endpoints: { chat: string };
  models: ProviderModel[];
  defaults?: { temperature?: number; maxTokens?: number };
  isBuiltIn: boolean;
  customHeaders?: Record<string, string>;
}
