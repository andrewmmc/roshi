import type { ProviderConfig } from '@/types/provider';
import type { NormalizedRequest, NormalizedResponse, NormalizedStreamChunk } from '@/types/normalized';

export interface ProviderAdapter {
  buildRequestBody(request: NormalizedRequest, provider: ProviderConfig): Record<string, unknown>;
  buildRequestHeaders(provider: ProviderConfig, customHeaders?: Record<string, string>): Record<string, string>;
  buildRequestUrl(provider: ProviderConfig): string;
  parseResponse(raw: Record<string, unknown>): NormalizedResponse;
  parseStreamChunk(data: string): NormalizedStreamChunk | null;
}
