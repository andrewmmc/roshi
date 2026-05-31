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
        input_tokens: number;
        output_tokens: number;
      }
    | undefined,
): NormalizedResponse['usage'] {
  return usage
    ? {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      }
    : null;
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
