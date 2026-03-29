import { nanoid } from 'nanoid';

import type { HeaderEntry } from './header-list-editor';

/**
 * Convert header entries array to Record<string, string>, filtering out entries with empty keys
 */
export function headersToRecord(
  headers: HeaderEntry[],
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const header of headers) {
    if (header.key.trim()) {
      record[header.key] = header.value;
    }
  }
  return record;
}

/**
 * Convert Record<string, string> to header entries array
 */
/**
 * Mask sensitive header values (auth tokens, Bearer prefixed values)
 */
export function maskHeaderValue(
  key: string,
  value: string,
  apiKey?: string,
): string {
  const lower = key.toLowerCase();
  if (lower === 'authorization' || lower === 'x-api-key') {
    if (!apiKey) return '';
  }
  if (value.startsWith('Bearer ')) {
    const token = value.slice(7);
    if (!token) return 'Bearer ';
    return (
      'Bearer ' +
      (token.length > 8 ? token.slice(0, 4) + '••••••••' : '••••••••')
    );
  }
  if (apiKey && value === apiKey) {
    return value.length > 8 ? value.slice(0, 4) + '••••••••' : '••••••••';
  }
  return value;
}

export function recordToHeaders(
  record: Record<string, string> = {},
): HeaderEntry[] {
  const entries = Object.entries(record).map(([key, value]) => ({
    id: nanoid(),
    key,
    value,
  }));
  // Always include at least one empty entry
  if (entries.length === 0) {
    entries.push({ id: nanoid(), key: '', value: '' });
  }
  return entries;
}
