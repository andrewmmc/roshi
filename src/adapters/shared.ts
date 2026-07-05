import type { NormalizedResponse } from '@/types/normalized';
import type { ProviderConfig } from '@/types/provider';

export function joinBaseUrlAndEndpoint(
  baseUrl: string,
  endpoint: string,
): string {
  return `${baseUrl.replace(/\/$/, '')}${endpoint}`;
}

export function appendApiKeyQueryParam(
  url: string,
  apiKey: string,
  paramName = 'key',
): string {
  if (!apiKey) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${paramName}=${encodeURIComponent(apiKey)}`;
}

export function buildJsonRequestHeaders(
  provider: ProviderConfig,
  customHeaders: Record<string, string> | undefined,
  defaultApiKeyHeader: string,
  baseHeaders: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...baseHeaders,
  };

  if (provider.auth.type === 'bearer') {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  } else if (provider.auth.type === 'api-key-header') {
    headers[provider.auth.headerName || defaultApiKeyHeader] = provider.apiKey;
  }

  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }

  return headers;
}

/**
 * Normalize a provider error value (string or `{ message | type }` object)
 * into a human-readable message.
 */
export function extractErrorMessage(
  error: unknown,
  fallback = 'Provider returned an error',
): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const obj = error as { message?: unknown; type?: unknown };
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message;
    }
    if (typeof obj.type === 'string' && obj.type.trim()) {
      return obj.type;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Detect the common OpenAI/Gemini-style top-level `{ "error": ... }` payload
 * that some providers emit as an SSE `data:` line after a 200 OK.
 */
export function parseTopLevelStreamError(data: string): string | null {
  try {
    const parsed = JSON.parse(data) as { error?: unknown };
    if (parsed && typeof parsed === 'object' && parsed.error != null) {
      return extractErrorMessage(parsed.error);
    }
  } catch {
    // Not JSON (or partial); nothing to surface.
  }
  return null;
}

export function extractDataUriBase64(dataUri: string): {
  mediaType: string;
  data: string;
} | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

export function mapOpenAIUsage(
  usage:
    | {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      }
    | undefined,
): NormalizedResponse['usage'] {
  return usage
    ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      }
    : null;
}

export function mapAnthropicUsage(
  usage:
    | {
        input_tokens?: number;
        output_tokens?: number;
      }
    | undefined,
): NormalizedResponse['usage'] {
  if (!usage) return null;
  // Anthropic splits usage across stream events: `message_start` carries
  // `input_tokens` (with `output_tokens: 0`), while `message_delta` carries
  // only the final `output_tokens`. Tolerate either field being absent so the
  // stream loop can merge the two into a correct total.
  const promptTokens = usage.input_tokens ?? 0;
  const completionTokens = usage.output_tokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

/**
 * Merge usage across streamed chunks. Providers report usage differently:
 * OpenAI sends one complete usage object, Anthropic splits prompt/completion
 * tokens across `message_start`/`message_delta`, and Gemini repeats cumulative
 * totals. Prefer the latest non-zero value for each field, and keep the largest
 * reported total (which may exceed prompt+completion when a provider counts
 * reasoning/thinking tokens).
 */
export function mergeUsage(
  prev: NormalizedResponse['usage'],
  next: NormalizedResponse['usage'],
): NormalizedResponse['usage'] {
  if (!next) return prev;
  if (!prev) return next;
  const promptTokens = next.promptTokens || prev.promptTokens;
  const completionTokens = next.completionTokens || prev.completionTokens;
  const totalTokens = Math.max(
    next.totalTokens || 0,
    prev.totalTokens || 0,
    promptTokens + completionTokens,
  );
  return { promptTokens, completionTokens, totalTokens };
}

export function mapGeminiUsage(
  usage:
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
    | undefined,
): NormalizedResponse['usage'] {
  return usage
    ? {
        promptTokens: usage.promptTokenCount ?? 0,
        completionTokens: usage.candidatesTokenCount ?? 0,
        totalTokens: usage.totalTokenCount ?? 0,
      }
    : null;
}
