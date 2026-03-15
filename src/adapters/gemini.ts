import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import type { NormalizedRequest, NormalizedResponse, NormalizedStreamChunk } from '@/types/normalized';

function mapRoleToGemini(role: 'system' | 'user' | 'assistant'): 'user' | 'model' {
  if (role === 'assistant') return 'model';
  return 'user';
}

function extractGeminiText(parts: unknown): string {
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const text = (part as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .join('');
}

function parseGeminiUsage(usageMetadata: unknown): NormalizedResponse['usage'] {
  if (!usageMetadata || typeof usageMetadata !== 'object') return null;
  const prompt = (usageMetadata as { promptTokenCount?: unknown }).promptTokenCount;
  const completion = (usageMetadata as { candidatesTokenCount?: unknown }).candidatesTokenCount;
  const total = (usageMetadata as { totalTokenCount?: unknown }).totalTokenCount;

  if (typeof prompt !== 'number' && typeof completion !== 'number' && typeof total !== 'number') {
    return null;
  }

  const promptTokens = typeof prompt === 'number' ? prompt : 0;
  const completionTokens = typeof completion === 'number' ? completion : 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: typeof total === 'number' ? total : promptTokens + completionTokens,
  };
}

export const geminiAdapter: ProviderAdapter = {
  buildRequestBody(request: NormalizedRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      contents: request.messages
        .filter((m) => m.content.trim())
        .map((m) => ({
          role: mapRoleToGemini(m.role),
          parts: [{ text: m.content }],
        })),
    };

    if (request.systemPrompt?.trim()) {
      body.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const generationConfig: Record<string, unknown> = {};
    if (request.temperature !== undefined) {
      generationConfig.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = request.maxTokens;
    }
    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    return body;
  },

  buildRequestHeaders(provider: ProviderConfig, customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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

  buildRequestUrl(provider: ProviderConfig, model: string, request: NormalizedRequest): string {
    const base = provider.baseUrl.replace(/\/$/, '');
    const endpoint = request.stream
      ? `models/${encodeURIComponent(model)}:streamGenerateContent`
      : `models/${encodeURIComponent(model)}:generateContent`;
    const url = new URL(`${base}/${endpoint}`);

    if (provider.auth.type === 'query-param') {
      url.searchParams.set('key', provider.apiKey);
    }
    if (request.stream) {
      url.searchParams.set('alt', 'sse');
    }

    return url.toString();
  },

  parseResponse(raw: Record<string, unknown>): NormalizedResponse {
    const data = raw as {
      responseId?: string;
      modelVersion?: string;
      model?: string;
      candidates?: {
        finishReason?: string | null;
        content?: { parts?: unknown };
      }[];
      usageMetadata?: unknown;
    };

    const candidate = data.candidates?.[0];
    return {
      id: data.responseId || '',
      model: data.modelVersion || data.model || '',
      content: extractGeminiText(candidate?.content?.parts),
      role: 'assistant',
      finishReason: candidate?.finishReason || null,
      usage: parseGeminiUsage(data.usageMetadata),
    };
  },

  parseStreamChunk(data: string): NormalizedStreamChunk | null {
    if (data === '[DONE]') return null;

    try {
      const parsed = JSON.parse(data) as {
        responseId?: string;
        modelVersion?: string;
        candidates?: {
          finishReason?: string | null;
          content?: { parts?: unknown };
        }[];
        usageMetadata?: unknown;
      };
      const candidate = parsed.candidates?.[0];
      const content = extractGeminiText(candidate?.content?.parts);
      const finishReason = candidate?.finishReason || null;
      const usage = parseGeminiUsage(parsed.usageMetadata);
      const id = parsed.responseId;
      const model = parsed.modelVersion;

      if (!content && !finishReason && !usage && !id && !model) return null;

      return {
        content,
        finishReason,
        usage: usage || undefined,
        id,
        model,
      };
    } catch {
      return null;
    }
  },
};
