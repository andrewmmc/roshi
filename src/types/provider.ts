export interface ProviderModel {
  id: string;
  name: string;
  displayName: string;
  maxTokens?: number;
  supportsStreaming: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'openai-compatible' | 'anthropic' | 'google-gemini' | 'custom';
  baseUrl: string;
  auth: {
    type: 'bearer' | 'api-key-header' | 'query-param' | 'none';
    headerName?: string;
    valuePrefix?: string;
  };
  apiKey: string;
  endpoints: { chat: string };
  models: ProviderModel[];
  defaults?: { temperature?: number; maxTokens?: number };
  isBuiltIn: boolean;
  customHeaders?: Record<string, string>;
}
