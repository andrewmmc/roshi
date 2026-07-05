import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import type {
  MessageAttachment,
  NormalizedRequest,
  NormalizedResponse,
  NormalizedStreamChunk,
} from '@/types/normalized';
import { isImageMimeType } from '@/utils/mime';
import {
  appendApiKeyQueryParam,
  buildJsonRequestHeaders,
  joinBaseUrlAndEndpoint,
  mapOpenAIUsage,
  parseTopLevelStreamError,
} from './shared';

function isGpt5Family(model: string): boolean {
  return /^gpt-5(?:\.|-|$)/.test(model);
}

function buildAttachmentBlock(att: MessageAttachment): Record<string, unknown> {
  if (isImageMimeType(att.mimeType)) {
    return {
      type: 'image_url',
      image_url: { url: att.data },
    };
  }
  return {
    type: 'file',
    file: { filename: att.filename, file_data: att.data },
  };
}

export const openaiAdapter: ProviderAdapter = {
  buildRequestBody(request: NormalizedRequest): Record<string, unknown> {
    const messages = request.systemPrompt
      ? [
          { role: 'system' as const, content: request.systemPrompt },
          ...request.messages,
        ]
      : request.messages;

    const body: Record<string, unknown> = {
      model: request.model,
      messages: messages.map((m) => {
        if (m.attachments && m.attachments.length > 0) {
          const content: Record<string, unknown>[] = [];
          if (m.content) {
            content.push({ type: 'text', text: m.content });
          }
          for (const att of m.attachments) {
            content.push(buildAttachmentBlock(att));
          }
          return { role: m.role, content };
        }
        return { role: m.role, content: m.content };
      }),
      stream: request.stream,
    };

    if (isGpt5Family(request.model)) {
      if (request.maxTokens !== undefined) {
        body.max_completion_tokens = request.maxTokens;
      }
    } else {
      if (request.temperature !== undefined)
        body.temperature = request.temperature;
      if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
      if (request.topP !== undefined) body.top_p = request.topP;
      if (request.frequencyPenalty !== undefined)
        body.frequency_penalty = request.frequencyPenalty;
      if (request.presencePenalty !== undefined)
        body.presence_penalty = request.presencePenalty;
    }

    if (request.stream) {
      body.stream_options = { include_usage: true };
    }

    return body;
  },

  buildRequestHeaders(
    provider: ProviderConfig,
    customHeaders?: Record<string, string>,
  ): Record<string, string> {
    return buildJsonRequestHeaders(provider, customHeaders, 'x-api-key');
  },

  buildRequestUrl(provider: ProviderConfig): string {
    const url = joinBaseUrlAndEndpoint(
      provider.baseUrl,
      provider.endpoints.chat,
    );
    if (provider.auth.type === 'query-param' && provider.apiKey) {
      return appendApiKeyQueryParam(url, provider.apiKey);
    }
    return url;
  },

  parseResponse(raw: Record<string, unknown>): NormalizedResponse {
    const data = raw as {
      id: string;
      model: string;
      choices: {
        message: { content: string; role: string };
        finish_reason: string;
      }[];
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    const choice = data.choices?.[0];

    return {
      id: data.id || '',
      model: data.model || '',
      content: choice?.message?.content || '',
      role: 'assistant',
      finishReason: choice?.finish_reason || null,
      usage: mapOpenAIUsage(data.usage),
    };
  },

  parseStreamChunk(data: string): NormalizedStreamChunk | null {
    if (data === '[DONE]') return null;

    try {
      const parsed = JSON.parse(data) as {
        id?: string;
        model?: string;
        choices?: {
          delta?: { content?: string };
          finish_reason?: string | null;
        }[];
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
      };

      const choice = parsed.choices?.[0];
      if (!choice && !parsed.usage) return null;

      return {
        content: choice?.delta?.content || '',
        finishReason: choice?.finish_reason || null,
        model: parsed.model,
        id: parsed.id,
        usage: parsed.usage ? mapOpenAIUsage(parsed.usage) : undefined,
      };
    } catch {
      return null;
    }
  },

  parseStreamError(data: string): string | null {
    if (data === '[DONE]') return null;
    return parseTopLevelStreamError(data);
  },
};
