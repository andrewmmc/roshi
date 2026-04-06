import type { HistoryEntry } from '@/types/history';
import type { ProviderConfig } from '@/types/provider';
import { sortProvidersByName } from '@/utils/sort-providers';
import type { NormalizedRequest, NormalizedResponse } from '@/types/normalized';

const EXPORT_VERSION = 1;

interface ExportEnvelope<T> {
  app: 'roshi';
  version: number;
  exportedAt: string;
  type: 'providers' | 'history' | 'history-entry';
  data: T;
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateTag(): string {
  return new Date().toISOString().slice(0, 10);
}

const SENSITIVE_HEADERS = new Set(['authorization', 'x-api-key']);

function redactHeaders(
  headers: Record<string, string> | null,
): Record<string, string> | null {
  if (!headers) return null;
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) =>
      SENSITIVE_HEADERS.has(k.toLowerCase()) ? [k, 'REDACTED'] : [k, v],
    ),
  );
}

function redactHistoryEntry(entry: HistoryEntry): HistoryEntry {
  return { ...entry, requestHeaders: redactHeaders(entry.requestHeaders) };
}

export function exportProviders(
  providers: ProviderConfig[],
  options: { redactKeys?: boolean } = {},
): void {
  const { redactKeys = true } = options;
  const ordered = sortProvidersByName(providers);
  const data = redactKeys
    ? ordered.map((p) => ({ ...p, apiKey: p.apiKey ? 'REDACTED' : '' }))
    : ordered;
  const envelope: ExportEnvelope<typeof data> = {
    app: 'roshi',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    type: 'providers',
    data,
  };
  downloadJson(envelope, `roshi-providers-${dateTag()}.json`);
}

export function exportHistory(entries: HistoryEntry[]): void {
  const envelope: ExportEnvelope<HistoryEntry[]> = {
    app: 'roshi',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    type: 'history',
    data: entries.map(redactHistoryEntry),
  };
  downloadJson(envelope, `roshi-history-${dateTag()}.json`);
}

export function exportHistoryEntry(entry: HistoryEntry): void {
  const envelope: ExportEnvelope<HistoryEntry> = {
    app: 'roshi',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    type: 'history-entry',
    data: redactHistoryEntry(entry),
  };
  const tag = new Date(entry.createdAt).toISOString().slice(0, 10);
  downloadJson(envelope, `roshi-entry-${tag}.json`);
}

export interface CurrentRequestExport {
  sentRequest: NormalizedRequest | null;
  response: NormalizedResponse | null;
  rawRequest: Record<string, unknown> | null;
  rawResponse: Record<string, unknown> | null;
  requestUrl: string | null;
  requestHeaders: Record<string, string> | null;
  responseHeaders: Record<string, string> | null;
  error: string | null;
  durationMs: number | null;
  statusCode: number | null;
}

export function exportCurrentRequest(data: CurrentRequestExport): void {
  const envelope: ExportEnvelope<CurrentRequestExport> = {
    app: 'roshi',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    type: 'history-entry',
    data: { ...data, requestHeaders: redactHeaders(data.requestHeaders) },
  };
  downloadJson(envelope, `roshi-entry-${dateTag()}.json`);
}
