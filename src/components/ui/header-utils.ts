export {
  createEmptyHeaderEntry,
  headersToHistoryEntries,
  headersToRecord,
  historyEntriesToHeaders,
  recordToHeaders,
  type HeaderEntry,
  type HistoryHeaderEntry,
} from '@/utils/headers';

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
