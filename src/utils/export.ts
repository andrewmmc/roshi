import type { HistoryEntry } from '@/types/history';
import type { ProviderConfig } from '@/types/provider';
import { sortProvidersByName } from '@/utils/sort-providers';
import type { NormalizedRequest, NormalizedResponse } from '@/types/normalized';
import type { EvalRunRecord } from '@/types/eval';
import { isTauri } from '@tauri-apps/api/core';
import { normalizeProviderConfig } from '@/stores/provider-store';

const EXPORT_VERSION = 1;

type ExportType =
  | 'providers'
  | 'history'
  | 'history-entry'
  | 'eval-run'
  | 'raw-request'
  | 'raw-response'
  | 'headers'
  | 'code-snippet';

interface ExportEnvelope<T> {
  app: 'roshi';
  version: number;
  exportedAt: string;
  type: ExportType;
  data: T;
}

async function downloadJson(data: unknown, filename: string): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await downloadFile(json, filename, 'application/json', 'JSON', 'json');
}

async function downloadFile(
  contents: string,
  filename: string,
  mimeType: string,
  dialogName: string,
  extension: string,
): Promise<void> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: dialogName, extensions: [extension] }],
    });
    if (filePath) {
      await writeTextFile(filePath, contents);
    }
    return;
  }

  const blob = new Blob([contents], { type: mimeType });
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
  const ordered = sortProvidersByName(providers.map(normalizeProviderConfig));
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

export interface HeadersExport {
  requestUrl: string | null;
  requestHeaders: Record<string, string> | null;
  responseHeaders: Record<string, string> | null;
}

export function buildRawRequestExportPayload(
  rawRequest: Record<string, unknown> | null,
): Record<string, unknown> | null {
  return rawRequest;
}

export function buildRawResponseExportPayload(
  rawResponse: Record<string, unknown> | null,
): Record<string, unknown> | null {
  return rawResponse;
}

export function buildHeadersExportPayload(data: HeadersExport): HeadersExport {
  return {
    requestUrl: data.requestUrl,
    requestHeaders: redactHeaders(data.requestHeaders),
    responseHeaders: data.responseHeaders,
  };
}

function buildTypedExportEnvelope<T>(
  type: ExportType,
  data: T,
): ExportEnvelope<T> {
  return {
    app: 'roshi',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    type,
    data,
  };
}

export function exportRawRequestJson(
  rawRequest: Record<string, unknown> | null,
): void {
  const envelope = buildTypedExportEnvelope(
    'raw-request',
    buildRawRequestExportPayload(rawRequest),
  );
  downloadJson(envelope, `roshi-raw-request-${dateTag()}.json`);
}

export function exportRawResponseJson(
  rawResponse: Record<string, unknown> | null,
): void {
  const envelope = buildTypedExportEnvelope(
    'raw-response',
    buildRawResponseExportPayload(rawResponse),
  );
  downloadJson(envelope, `roshi-raw-response-${dateTag()}.json`);
}

export function exportHeadersJson(data: HeadersExport): void {
  const envelope = buildTypedExportEnvelope(
    'headers',
    buildHeadersExportPayload(data),
  );
  downloadJson(envelope, `roshi-headers-${dateTag()}.json`);
}

export function buildCodeSnippetExportPayload(code: string, label: string) {
  return { label, code };
}

function codeSnippetExtension(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes('python')) return 'py';
  if (normalized.includes('node')) return 'ts';
  return 'txt';
}

export function exportCodeSnippet(code: string, label: string): void {
  const extension = codeSnippetExtension(label);
  void downloadFile(
    code,
    `roshi-code-${slugify(label) || 'snippet'}-${dateTag()}.${extension}`,
    'text/plain',
    'Text',
    extension,
  );
}

export function exportEvalRunJson(record: EvalRunRecord): void {
  const envelope: ExportEnvelope<EvalRunRecord> = {
    app: 'roshi',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    type: 'eval-run',
    data: record,
  };
  const tag = new Date(record.createdAt).toISOString().slice(0, 10);
  const slug = slugify(record.name);
  const suffix = slug ? `-${slug}` : '';
  downloadJson(envelope, `roshi-eval-${tag}${suffix}.json`);
}

export function buildEvalRunCsv(record: EvalRunRecord): string {
  const header = [
    'runner_id',
    'provider',
    'model',
    'status',
    'duration_ms',
    'ttft_ms',
    'tokens_per_sec',
    'prompt_tokens',
    'completion_tokens',
    'total_tokens',
    'cost_usd',
    'response_chars',
    'finish_reason',
    'status_code',
    'rating',
    'thumbs',
    'judge_helpfulness',
    'judge_accuracy',
    'judge_clarity',
    'judge_overall',
    'judge_winner',
    'error',
  ];

  const rows = record.results.map((result) => {
    const runner = record.runners.find((r) => r.id === result.runnerId);
    const score = record.judgeResult?.scores?.[result.runnerId];
    const isWinner = record.judgeResult?.winnerRunnerId === result.runnerId;
    return [
      result.runnerId,
      runner?.providerName ?? '',
      runner?.modelId ?? '',
      result.status,
      result.metrics.durationMs ?? '',
      result.metrics.ttftMs ?? '',
      result.metrics.tokensPerSec !== null
        ? result.metrics.tokensPerSec.toFixed(2)
        : '',
      result.metrics.promptTokens ?? '',
      result.metrics.completionTokens ?? '',
      result.metrics.totalTokens ?? '',
      result.metrics.costUsd !== null ? result.metrics.costUsd.toFixed(6) : '',
      result.metrics.responseChars ?? '',
      result.metrics.finishReason ?? '',
      result.metrics.statusCode ?? '',
      result.rating ?? '',
      result.thumbs ?? '',
      score?.helpfulness ?? '',
      score?.accuracy ?? '',
      score?.clarity ?? '',
      score?.overall ?? '',
      isWinner ? 'true' : '',
      result.error ?? '',
    ];
  });

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function exportEvalRunCsv(record: EvalRunRecord): void {
  const csv = buildEvalRunCsv(record);
  const tag = new Date(record.createdAt).toISOString().slice(0, 10);
  const slug = slugify(record.name);
  const suffix = slug ? `-${slug}` : '';
  void downloadFile(
    csv,
    `roshi-eval-${tag}${suffix}.csv`,
    'text/csv',
    'CSV',
    'csv',
  );
}

function csvCell(value: string | number): string {
  const text = typeof value === 'number' ? String(value) : value;
  if (text === '') return '';
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function slugify(value: string | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
