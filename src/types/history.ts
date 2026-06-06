import type {
  NormalizedMessage,
  NormalizedRequest,
  NormalizedResponse,
} from './normalized';
import type { HistoryHeaderEntry } from '@/utils/headers';

export type { HistoryHeaderEntry } from '@/utils/headers';

export interface HistoryEntry {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  collectionId?: string;
  savedRequestId?: string;
  request: NormalizedRequest;
  customHeaders?: HistoryHeaderEntry[];
  rawRequest: Record<string, unknown>;
  requestUrl: string | null;
  requestHeaders: Record<string, string> | null;
  responseHeaders: Record<string, string> | null;
  response: NormalizedResponse | null;
  rawResponse: Record<string, unknown> | null;
  error: string | null;
  durationMs: number | null;
  statusCode: number | null;
  createdAt: Date;
}

export type CollectionKind = 'user' | 'templates';

export interface Collection {
  id: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  createdAt: Date;
  kind?: CollectionKind;
}

export interface SavedRequestSnapshot {
  messages: NormalizedMessage[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK?: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
  thinkingEnabled?: boolean;
  thinkingBudgetTokens?: number;
  effort?: string;
  verbosity?: string;
  customHeaders?: HistoryHeaderEntry[];
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  name: string;
  providerId: string;
  providerName: string;
  modelId: string;
  request: SavedRequestSnapshot;
  createdAt: Date;
  updatedAt: Date;
  /** Built-in starter templates cannot be edited in place. */
  isTemplate?: boolean;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  createdAt: Date;
  updatedAt: Date;
}
