import type { ProviderConfig } from '@/types/provider';
import type {
  NormalizedRequest,
  NormalizedResponse,
  NormalizedStreamChunk,
} from '@/types/normalized';

export interface ProviderAdapter {
  buildRequestBody(
    request: NormalizedRequest,
    provider: ProviderConfig,
  ): Record<string, unknown>;
  buildRequestHeaders(
    provider: ProviderConfig,
    customHeaders?: Record<string, string>,
  ): Record<string, string>;
  buildRequestUrl(
    provider: ProviderConfig,
    request?: NormalizedRequest,
  ): string;
  parseResponse(raw: Record<string, unknown>): NormalizedResponse;
  parseStreamChunk(data: string): NormalizedStreamChunk | null;
  /**
   * Inspect a raw SSE `data:` payload for a provider-reported error (e.g. an
   * error event emitted mid-stream after a 200 OK). Returns a human-readable
   * error message when the payload represents a failure, otherwise `null`.
   * The stream loop uses this to surface errors that would otherwise be
   * silently dropped by `parseStreamChunk`.
   */
  parseStreamError?(data: string): string | null;
}
