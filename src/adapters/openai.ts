import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import type { NormalizedRequest, NormalizedResponse, NormalizedStreamChunk } from '@/types/normalized';

export const openaiAdapter: ProviderAdapter = {
  buildRequestBody(request: NormalizedRequest, _provider: ProviderConfig): Record<string, unknown> {
    const messages = request.systemPrompt
      ? [{ role: 'system' as const, content: request.systemPrompt }, ...request.messages]
      : request.messages;

    const body: Record<string, unknown> = {
      model: request.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: request.stream,
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    if (request.stream) {
      body.stream_options = { include_usage: true };
    }

    return body;
  },

  buildRequestHeaders(provider: ProviderConfig, customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider.auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    } else if (provider.auth.type === 'api-key-header') {
      const headerName = provider.auth.headerName || 'x-api-key';
      headers[headerName] = provider.apiKey;
    }

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  },

  buildRequestUrl(provider: ProviderConfig, _model: string): string {
    const base = provider.baseUrl.replace(/\/$/, '');
    const endpoint = provider.endpoints.chat;
    return `${base}${endpoint}`;
  },

  parseResponse(raw: Record<string, unknown>): NormalizedResponse {
    const data = raw as {
      id: string;
      model: string;
      choices: { message: { content: string; role: string }; finish_reason: string }[];
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const choice = data.choices?.[0];

    return {
      id: data.id || '',
      model: data.model || '',
      content: choice?.message?.content || '',
      role: 'assistant',
      finishReason: choice?.finish_reason || null,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : null,
    };
  },

  parseStreamChunk(data: string): NormalizedStreamChunk | null {
    if (data === '[DONE]') return null;

    try {
      const parsed = JSON.parse(data) as {
        id?: string;
        model?: string;
        choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const choice = parsed.choices?.[0];
      if (!choice && !parsed.usage) return null;

      return {
        content: choice?.delta?.content || '',
        finishReason: choice?.finish_reason || null,
        model: parsed.model,
        id: parsed.id,
      };
    } catch {
      return null;
    }
  },
};
