import type { ProviderAdapter } from './types';
import type { ProviderConfig } from '@/types/provider';
import type {
  MessageAttachment,
  NormalizedRequest,
  NormalizedResponse,
  NormalizedStreamChunk,
} from '@/types/normalized';
import { isImageMimeType } from '@/utils/mime';

function extractBase64(dataUri: string): {
  mediaType: string;
  data: string;
} | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

function buildInlineData(att: MessageAttachment): Record<string, unknown> {
  if (isImageMimeType(att.mimeType)) {
    const parsed = extractBase64(att.data);
    if (parsed) {
      return {
        inlineData: { mimeType: parsed.mediaType, data: parsed.data },
      };
    }
    return { text: `[attachment: ${att.filename}]` };
  }
  const parsed = extractBase64(att.data);
  if (parsed) {
    return {
      inlineData: { mimeType: parsed.mediaType, data: parsed.data },
    };
  }
  return { text: `[attachment: ${att.filename}]` };
}

export const geminiAdapter: ProviderAdapter = {
  buildRequestUrl(
    provider: ProviderConfig,
    request?: NormalizedRequest,
  ): string {
    const base = provider.baseUrl.replace(/\/$/, '');
    const endpoint = provider.endpoints.chat.replace(/\/$/, '');
    const model = request?.model ?? '';
    const action = request?.stream
      ? `:streamGenerateContent?alt=sse`
      : `:generateContent`;
    const modelSegment = model ? `/${model}` : '';
    let url = `${base}${endpoint}${modelSegment}${action}`;

    if (provider.auth.type === 'query-param' && provider.apiKey) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}key=${encodeURIComponent(provider.apiKey)}`;
    }

    return url;
  },

  buildRequestHeaders(
    provider: ProviderConfig,
    customHeaders?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider.auth.type === 'api-key-header') {
      const headerName = provider.auth.headerName || 'x-goog-api-key';
      headers[headerName] = provider.apiKey;
    } else if (provider.auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  },

  buildRequestBody(request: NormalizedRequest): Record<string, unknown> {
    const contents: Record<string, unknown>[] = [];

    for (const m of request.messages) {
      if (m.role === 'system') continue;

      const role = m.role === 'assistant' ? 'model' : 'user';
      const parts: Record<string, unknown>[] = [];

      if (m.content) {
        parts.push({ text: m.content });
      }

      if (m.attachments) {
        for (const att of m.attachments) {
          parts.push(buildInlineData(att));
        }
      }

      contents.push({ role, parts });
    }

    const body: Record<string, unknown> = { contents };

    if (request.systemPrompt) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] };
    }

    const generationConfig: Record<string, unknown> = {};
    if (request.temperature !== undefined)
      generationConfig.temperature = request.temperature;
    if (request.topP !== undefined) generationConfig.topP = request.topP;
    if (request.topK !== undefined && request.topK > 0)
      generationConfig.topK = request.topK;
    if (request.maxTokens !== undefined)
      generationConfig.maxOutputTokens = request.maxTokens;
    if (request.frequencyPenalty !== undefined)
      generationConfig.frequencyPenalty = request.frequencyPenalty;
    if (request.presencePenalty !== undefined)
      generationConfig.presencePenalty = request.presencePenalty;

    if (request.thinking?.enabled) {
      generationConfig.thinkingConfig = {
        thinkingBudget: request.thinking.budgetTokens,
      };
    }

    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    return body;
  },

  parseResponse(raw: Record<string, unknown>): NormalizedResponse {
    const data = raw as {
      candidates?: {
        content?: { parts?: { text?: string; thought?: boolean }[] };
        finishReason?: string;
      }[];
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
      responseId?: string;
      modelVersion?: string;
    };

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const content = parts
      .filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('');

    return {
      id: data.responseId || '',
      model: data.modelVersion || '',
      content,
      role: 'assistant',
      finishReason: candidate?.finishReason || null,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : null,
    };
  },

  parseStreamChunk(data: string): NormalizedStreamChunk | null {
    try {
      const parsed = JSON.parse(data) as {
        candidates?: {
          content?: { parts?: { text?: string; thought?: boolean }[] };
          finishReason?: string;
        }[];
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
        responseId?: string;
        modelVersion?: string;
      };

      const candidate = parsed.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const textParts = parts.filter((p) => !p.thought);
      const content = textParts.map((p) => p.text ?? '').join('');

      return {
        content,
        finishReason: candidate?.finishReason || null,
        id: parsed.responseId,
        model: parsed.modelVersion,
        usage: parsed.usageMetadata
          ? {
              promptTokens: parsed.usageMetadata.promptTokenCount ?? 0,
              completionTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: parsed.usageMetadata.totalTokenCount ?? 0,
            }
          : undefined,
      };
    } catch {
      return null;
    }
  },
};
