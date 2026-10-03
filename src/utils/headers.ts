import { nanoid } from 'nanoid';

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

export interface HistoryHeaderEntry {
  key: string;
  value: string;
}

/** HTTP field names are case-insensitive; later records override earlier ones. */
export function mergeHeaderRecords(
  ...records: (Record<string, string> | undefined)[]
): Record<string, string> {
  const entries = new Map<string, [string, string]>();
  for (const record of records) {
    for (const [key, value] of Object.entries(record ?? {})) {
      entries.set(key.toLowerCase(), [key, value]);
    }
  }
  return Object.fromEntries(entries.values());
}

export function createEmptyHeaderEntry(): HeaderEntry {
  return { id: nanoid(), key: '', value: '' };
}

export function headersToRecord(
  headers: readonly Pick<HeaderEntry, 'key' | 'value'>[],
): Record<string, string> {
  const entries = new Map<string, [string, string]>();
  for (const header of headers) {
    const key = header.key.trim();
    if (key) {
      entries.set(key.toLowerCase(), [key, header.value]);
    }
  }
  return Object.fromEntries(entries.values());
}

export function headersToHistoryEntries(
  headers: readonly Pick<HeaderEntry, 'key' | 'value'>[],
): HistoryHeaderEntry[] {
  return Object.entries(headersToRecord(headers)).map(([key, value]) => ({
    key,
    value,
  }));
}

export function historyEntriesToHeaders(
  headers: readonly HistoryHeaderEntry[] = [],
): HeaderEntry[] {
  const entries = headers
    .filter((header) => header.key.trim())
    .map((header) => ({ ...header, id: nanoid() }));
  return entries.length > 0 ? entries : [createEmptyHeaderEntry()];
}

export function recordToHeaders(
  record: Record<string, string> = {},
): HeaderEntry[] {
  const entries = Object.entries(record).map(([key, value]) => ({
    id: nanoid(),
    key,
    value,
  }));
  return entries.length > 0 ? entries : [createEmptyHeaderEntry()];
}
