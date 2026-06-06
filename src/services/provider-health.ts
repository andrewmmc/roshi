import { sendRequest, RequestError } from '@/services/llm-client';
import type { ProviderConfig } from '@/types/provider';
import type { NormalizedRequest } from '@/types/normalized';

const HEALTH_CHECK_TIMEOUT_MS = 30_000;

export type ProviderHealthStatus = 'success' | 'error' | 'skipped';

export interface ProviderHealthResult {
  status: ProviderHealthStatus;
  message: string;
  durationMs: number | null;
  statusCode: number | null;
  modelId: string | null;
}

export function buildHealthCheckRequest(modelId: string): NormalizedRequest {
  return {
    model: modelId,
    messages: [{ id: 'health-check', role: 'user', content: 'Hi' }],
    systemPrompt: '',
    stream: false,
    maxTokens: 1,
    temperature: 0,
  };
}

export async function checkProviderHealth(
  provider: ProviderConfig,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<ProviderHealthResult> {
  const { signal, timeoutMs = HEALTH_CHECK_TIMEOUT_MS } = options;

  if (provider.auth.type !== 'none' && !provider.apiKey.trim()) {
    return {
      status: 'skipped',
      message: 'API key not configured',
      durationMs: null,
      statusCode: null,
      modelId: null,
    };
  }

  const model = provider.models[0];
  if (!model) {
    return {
      status: 'skipped',
      message: 'No models configured',
      durationMs: null,
      statusCode: null,
      modelId: null,
    };
  }

  try {
    const result = await sendRequest({
      provider,
      request: buildHealthCheckRequest(model.id),
      signal,
      timeoutMs,
    });

    return {
      status: 'success',
      message: `OK (${result.durationMs}ms)`,
      durationMs: result.durationMs,
      statusCode: result.statusCode,
      modelId: model.id,
    };
  } catch (error) {
    if (error instanceof RequestError) {
      return {
        status: 'error',
        message: error.message,
        durationMs: error.durationMs,
        statusCode: error.status,
        modelId: model.id,
      };
    }

    const message =
      error instanceof Error ? error.message : 'Health check failed';
    return {
      status: 'error',
      message,
      durationMs: null,
      statusCode: null,
      modelId: model.id,
    };
  }
}
