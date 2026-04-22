import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import type {
  MessageAttachment,
  NormalizedRequest,
  NormalizedResponse,
  NormalizedStreamChunk,
} from '@/types/normalized';
import { isImageMimeType } from '@/utils/mime';

const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Claude Opus 4.7+ breaking changes:
 * - Sampling parameters (temperature, top_p, top_k) return 400 errors.
 * - Extended thinking budgets (`{type:"enabled", budget_tokens}`) removed;
 *   only adaptive thinking (`{type:"adaptive"}`) is supported.
 * - Effort is controlled via a top-level `effort` field instead.
 *
 * @see https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7
 */
function isOpus47OrNewer(model: string): boolean {
  // Match claude-opus-4-7, claude-opus-4-8, etc.
  const match = model.match(/^claude-opus-4-(\d+)/);
  if (!match) return false;
  return parseInt(match[1], 10) >= 7;
}

function extractBase64(dataUri: string): {
  mediaType: string;
  data: string;
} | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

function buildAttachmentBlock(att: MessageAttachment): Record<string, unknown> {
  if (isImageMimeType(att.mimeType)) {
    const parsed = extractBase64(att.data);
    if (parsed) {
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: parsed.mediaType,
          data: parsed.data,
        },
      };
    }
    return {
      type: 'image',
      source: { type: 'url', url: att.data },
    };
  }
  const parsed = extractBase64(att.data);
  if (parsed) {
    return {
      type: 'document',
      source: {
        type: 'base64',
        media_type: parsed.mediaType,
        data: parsed.data,
      },
    };
  }
  return {
    type: 'document',
    source: { type: 'url', url: att.data },
  };
}

export const anthropicAdapter: ProviderAdapter = {
  buildRequestBody(request: NormalizedRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: request.messages.map((m) => {
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

    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }

    const opus47 = isOpus47OrNewer(request.model);

    // Opus 4.7+ removed support for sampling parameters (temperature,
    // top_p, top_k); sending non-default values returns a 400 error.
    if (!opus47) {
      if (request.temperature !== undefined && request.topP !== undefined) {
        // Anthropic does not allow both temperature and top_p;
        // when both are set, send only temperature.
        body.temperature = Math.min(request.temperature, 1);
      } else {
        if (request.temperature !== undefined)
          body.temperature = Math.min(request.temperature, 1);
        if (request.topP !== undefined) body.top_p = request.topP;
      }
      if (request.topK !== undefined && request.topK > 0)
        body.top_k = request.topK;
    }

    if (request.thinking?.enabled) {
      if (opus47) {
        // Opus 4.7+ only supports adaptive thinking; extended thinking
        // budgets (`{type:"enabled", budget_tokens}`) were removed.
        // Effort is set via a top-level field (defaults to "high").
        body.thinking = { type: 'adaptive' };
        body.effort = 'high';
      } else {
        body.thinking = {
          type: 'enabled',
          budget_tokens: request.thinking.budgetTokens,
        };
      }
    }

    return body;
  },

  buildRequestHeaders(
    provider: ProviderConfig,
    customHeaders?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
    };

    if (provider.auth.type === 'api-key-header') {
      const headerName = provider.auth.headerName || 'x-api-key';
      headers[headerName] = provider.apiKey;
    } else if (provider.auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
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
      content?: { type: string; text?: string }[];
      stop_reason?: string;
      usage?: {
        input_tokens: number;
        output_tokens: number;
      };
    };

    const textBlocks = data.content?.filter((b) => b.type === 'text') ?? [];
    const content = textBlocks.map((b) => b.text ?? '').join('');

    return {
      id: data.id || '',
      model: data.model || '',
      content,
      role: 'assistant',
      finishReason: data.stop_reason || null,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : null,
    };
  },

  parseStreamChunk(data: string): NormalizedStreamChunk | null {
    try {
      const parsed = JSON.parse(data) as {
        type: string;
        index?: number;
        message?: {
          id?: string;
          model?: string;
          usage?: { input_tokens: number; output_tokens: number };
        };
        delta?: {
          type?: string;
          text?: string;
          stop_reason?: string;
        };
        usage?: { input_tokens: number; output_tokens: number };
      };

      switch (parsed.type) {
        case 'message_start':
          return {
            content: '',
            finishReason: null,
            model: parsed.message?.model,
            id: parsed.message?.id,
            usage: parsed.message?.usage
              ? {
                  promptTokens: parsed.message.usage.input_tokens,
                  completionTokens: parsed.message.usage.output_tokens,
                  totalTokens:
                    parsed.message.usage.input_tokens +
                    parsed.message.usage.output_tokens,
                }
              : undefined,
          };

        case 'content_block_delta':
          if (parsed.delta?.type === 'text_delta') {
            return {
              content: parsed.delta.text ?? '',
              finishReason: null,
            };
          }
          if (parsed.delta?.type === 'thinking_delta') {
            return {
              content: '',
              finishReason: null,
            };
          }
          return null;

        case 'message_delta':
          return {
            content: '',
            finishReason: parsed.delta?.stop_reason || null,
            usage: parsed.usage
              ? {
                  promptTokens: parsed.usage.input_tokens,
                  completionTokens: parsed.usage.output_tokens,
                  totalTokens:
                    parsed.usage.input_tokens + parsed.usage.output_tokens,
                }
              : undefined,
          };

        default:
          return null;
      }
    } catch {
      return null;
    }
  },
};
