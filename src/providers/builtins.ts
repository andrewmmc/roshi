import type { ProviderConfig } from '@/types/provider';

export const builtinProviders: Omit<ProviderConfig, 'id' | 'apiKey'>[] = [
  {
    name: 'OpenAI',
    type: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    auth: { type: 'bearer' },
    endpoints: { chat: '/chat/completions' },
    models: [
      { id: 'gpt-4o', name: 'gpt-4o', displayName: 'GPT-4o', supportsStreaming: true },
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini', displayName: 'GPT-4o Mini', supportsStreaming: true },
      { id: 'gpt-4.1', name: 'gpt-4.1', displayName: 'GPT-4.1', supportsStreaming: true },
      { id: 'gpt-4.1-mini', name: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini', supportsStreaming: true },
      { id: 'gpt-4.1-nano', name: 'gpt-4.1-nano', displayName: 'GPT-4.1 Nano', supportsStreaming: true },
      { id: 'o3-mini', name: 'o3-mini', displayName: 'o3-mini', supportsStreaming: true },
    ],
    defaults: { temperature: 1, maxTokens: 4096 },
    isBuiltIn: true,
  },
  {
    name: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    auth: { type: 'api-key-header', headerName: 'x-api-key' },
    endpoints: { chat: '/messages' },
    models: [
      { id: 'claude-opus-4-0-20250514', name: 'claude-opus-4-0-20250514', displayName: 'Claude Opus 4', supportsStreaming: true },
      { id: 'claude-sonnet-4-20250514', name: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', supportsStreaming: true },
      { id: 'claude-haiku-4-5-20251001', name: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5', supportsStreaming: true },
    ],
    defaults: { temperature: 1, maxTokens: 4096 },
    isBuiltIn: true,
  },
  {
    name: 'Google Gemini',
    type: 'google-gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    auth: { type: 'query-param' },
    endpoints: { chat: '/chat/completions' },
    models: [
      { id: 'gemini-2.5-pro', name: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', supportsStreaming: true },
      { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportsStreaming: true },
      { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', supportsStreaming: true },
    ],
    defaults: { temperature: 1, maxTokens: 4096 },
    isBuiltIn: true,
  },
  {
    name: 'OpenRouter',
    type: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    auth: { type: 'bearer' },
    endpoints: { chat: '/chat/completions' },
    models: [
      { id: 'openai/gpt-4o', name: 'openai/gpt-4o', displayName: 'GPT-4o (via OpenRouter)', supportsStreaming: true },
      { id: 'anthropic/claude-sonnet-4', name: 'anthropic/claude-sonnet-4', displayName: 'Claude Sonnet 4 (via OpenRouter)', supportsStreaming: true },
      { id: 'google/gemini-2.5-pro', name: 'google/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro (via OpenRouter)', supportsStreaming: true },
    ],
    defaults: { temperature: 1, maxTokens: 4096 },
    isBuiltIn: true,
  },
];
