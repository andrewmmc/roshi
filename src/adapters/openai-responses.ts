import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import type {
  MessageAttachment,
  NormalizedMessage,
  NormalizedRequest,
  NormalizedResponse,
  NormalizedStreamChunk,
} from '@/types/normalized';
import { isImageMimeType } from '@/utils/mime';
import {
  appendApiKeyQueryParam,
  buildJsonRequestHeaders,
  extractErrorMessage,
  joinBaseUrlAndEndpoint,
} from './shared';

function buildAttachmentBlock(att: MessageAttachment): Record<string, unknown> {
  if (isImageMimeType(att.mimeType)) {
    return {
      type: 'input_image',
      image_url: att.data,
    };
  }

  return {
    type: 'input_file',
    filename: att.filename,
    file_data: att.data,
  };
}

function buildInputMessage(
  message: NormalizedMessage,
): Record<string, unknown> {
  if (!message.attachments || message.attachments.length === 0) {
    return { role: message.role, content: message.content };
  }

  const content: Record<string, unknown>[] = [];
  if (message.content) {
    content.push({ type: 'input_text', text: message.content });
  }
  for (const attachment of message.attachments) {
    content.push(buildAttachmentBlock(attachment));
  }

  return { role: message.role, content };
}

function mapResponsesUsage(
  usage:
    | {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
      }
    | undefined,
): NormalizedResponse['usage'] {
  return usage
    ? {
        promptTokens: usage.input_tokens ?? 0,
        completionTokens: usage.output_tokens ?? 0,
        totalTokens:
          usage.total_tokens ??
          (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
      }
    : null;
}

function getResponseOutputText(raw: Record<string, unknown>): string {
  if (typeof raw.output_text === 'string') return raw.output_text;

  const output = raw.output;
  if (!Array.isArray(output)) return '';

  return output
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((content) => {
      if (!content || typeof content !== 'object') return '';
      const block = content as { text?: unknown; type?: unknown };
      return block.type === 'output_text' && typeof block.text === 'string'
        ? block.text
        : '';
    })
    .join('');
}

export const openaiResponsesAdapter: ProviderAdapter = {
  buildRequestBody(request: NormalizedRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model,
      input: request.messages.map(buildInputMessage),
      stream: request.stream,
    };

    if (request.systemPrompt) body.instructions = request.systemPrompt;
    if (request.temperature !== undefined)
      body.temperature = request.temperature;
    if (request.maxTokens !== undefined)
      body.max_output_tokens = request.maxTokens;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.effort !== undefined) {
      body.reasoning = { effort: request.effort };
    }
    if (request.verbosity !== undefined) {
      body.text = { verbosity: request.verbosity };
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
      provider.endpoints.responses ?? '/responses',
    );
    if (provider.auth.type === 'query-param' && provider.apiKey) {
      return appendApiKeyQueryParam(url, provider.apiKey);
    }
    return url;
  },

  parseResponse(raw: Record<string, unknown>): NormalizedResponse {
    const data = raw as {
      id?: string;
      model?: string;
      status?: string;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
      };
    };

    return {
      id: data.id || '',
      model: data.model || '',
      content: getResponseOutputText(raw),
      role: 'assistant',
      finishReason: data.status || null,
      usage: mapResponsesUsage(data.usage),
    };
  },

  parseStreamChunk(data: string): NormalizedStreamChunk | null {
    try {
      const parsed = JSON.parse(data) as {
        type?: string;
        delta?: string;
        response?: {
          id?: string;
          model?: string;
          status?: string;
          usage?: {
            input_tokens?: number;
            output_tokens?: number;
            total_tokens?: number;
          };
        };
      };

      if (parsed.type === 'response.output_text.delta') {
        return {
          content: parsed.delta ?? '',
          finishReason: null,
        };
      }

      if (parsed.type === 'response.completed' && parsed.response) {
        return {
          content: '',
          finishReason: parsed.response.status ?? null,
          model: parsed.response.model,
          id: parsed.response.id,
          usage: mapResponsesUsage(parsed.response.usage),
        };
      }

      return null;
    } catch {
      return null;
    }
  },

  parseStreamError(data: string): string | null {
    try {
      const parsed = JSON.parse(data) as {
        type?: string;
        message?: string;
        error?: unknown;
        response?: {
          error?: unknown;
          incomplete_details?: { reason?: string };
        };
      };

      if (parsed.type === 'error') {
        return extractErrorMessage(
          parsed.error ?? parsed.message,
          'Responses stream error',
        );
      }

      if (parsed.type === 'response.failed') {
        return extractErrorMessage(
          parsed.response?.error,
          'Response generation failed',
        );
      }

      if (parsed.type === 'response.incomplete') {
        const reason = parsed.response?.incomplete_details?.reason;
        return reason
          ? `Response incomplete: ${reason}`
          : 'Response incomplete';
      }
    } catch {
      // Not JSON; nothing to surface.
    }
    return null;
  },
};
