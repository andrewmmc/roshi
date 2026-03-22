import type { NormalizedRequest, NormalizedResponse } from './normalized';

export interface HistoryEntry {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  collectionId?: string;
  request: NormalizedRequest;
  rawRequest: Record<string, unknown>;
  response: NormalizedResponse | null;
  rawResponse: Record<string, unknown> | null;
  error: string | null;
  durationMs: number | null;
  statusCode: number | null;
  createdAt: Date;
}

export interface Collection {
  id: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  createdAt: Date;
}
