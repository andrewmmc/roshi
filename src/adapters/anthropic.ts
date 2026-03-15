import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import type { NormalizedRequest, NormalizedResponse, NormalizedStreamChunk } from '@/types/normalized';

const ANTHROPIC_VERSION = '2023-06-01';

function extractAnthropicText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return content
    .map((block) => {
      if (!block || typeof block !== 'object') return '';
      const text = (block as { type?: unknown; text?: unknown }).type === 'text'
        ? (block as { text?: unknown }).text
        : '';
      return typeof text === 'string' ? text : '';
    })
    .join('');
}

function parseAnthropicUsage(usage: unknown): NormalizedResponse['usage'] {
  if (!usage || typeof usage !== 'object') return null;
  const input = (usage as { input_tokens?: unknown }).input_tokens;
  const output = (usage as { output_tokens?: unknown }).output_tokens;
  if (typeof input !== 'number' && typeof output !== 'number') return null;

  const promptTokens = typeof input === 'number' ? input : 0;
  const completionTokens = typeof output === 'number' ? output : 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

export const anthropicAdapter: ProviderAdapter = {
  buildRequestBody(request: NormalizedRequest, provider: ProviderConfig): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages
        .filter((m) => m.content.trim())
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      max_tokens: request.maxTokens ?? provider.defaults?.maxTokens ?? 1024,
      stream: request.stream,
    };

    if (request.systemPrompt?.trim()) {
      body.system = request.systemPrompt;
    }
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    return body;
  },

  buildRequestHeaders(provider: ProviderConfig, customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
    };

    if (provider.auth.type === 'api-key-header') {
      const headerName = provider.auth.headerName || 'x-api-key';
      headers[headerName] = provider.apiKey;
    } else if (provider.auth.type === 'bearer') {
      headers.Authorization = `Bearer ${provider.apiKey}`;
    }

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  },

  buildRequestUrl(provider: ProviderConfig): string {
    const base = provider.baseUrl.replace(/\/$/, '');
    const endpoint = provider.endpoints.chat;
    return `${base}${endpoint}`;
  },

  parseResponse(raw: Record<string, unknown>): NormalizedResponse {
    const data = raw as {
      id?: string;
      model?: string;
      content?: unknown;
      stop_reason?: string | null;
      usage?: unknown;
    };

    return {
      id: data.id || '',
      model: data.model || '',
      content: extractAnthropicText(data.content),
      role: 'assistant',
      finishReason: data.stop_reason || null,
      usage: parseAnthropicUsage(data.usage),
    };
  },

  parseStreamChunk(data: string, event?: string): NormalizedStreamChunk | null {
    if (data === '[DONE]') return null;

    try {
      const parsed = JSON.parse(data) as {
        type?: string;
        message?: { id?: string; model?: string; usage?: unknown };
        delta?: { type?: string; text?: string; stop_reason?: string | null };
        usage?: { output_tokens?: number };
      };
      const type = parsed.type || event;

      if (type === 'content_block_delta') {
        const text = parsed.delta?.type === 'text_delta' ? parsed.delta.text || '' : '';
        if (!text) return null;
        return {
          content: text,
          finishReason: null,
        };
      }

      if (type === 'message_start') {
        const usage = parseAnthropicUsage(parsed.message?.usage);
        if (!parsed.message?.id && !parsed.message?.model && !usage) return null;
        return {
          content: '',
          finishReason: null,
          id: parsed.message?.id,
          model: parsed.message?.model,
          usage: usage || undefined,
        };
      }

      if (type === 'message_delta') {
        const outputTokens = parsed.usage?.output_tokens;
        return {
          content: '',
          finishReason: parsed.delta?.stop_reason || null,
          usage: typeof outputTokens === 'number'
            ? {
                promptTokens: 0,
                completionTokens: outputTokens,
                totalTokens: outputTokens,
              }
            : undefined,
        };
      }

      return null;
    } catch {
      return null;
    }
  },
};
