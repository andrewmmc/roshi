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

export function createEmptyHeaderEntry(): HeaderEntry {
  return { id: nanoid(), key: '', value: '' };
}

export function headersToRecord(
  headers: readonly Pick<HeaderEntry, 'key' | 'value'>[],
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const header of headers) {
    const key = header.key.trim();
    if (key) {
      record[key] = header.value;
    }
  }
  return record;
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
