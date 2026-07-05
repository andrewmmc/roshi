export {
  createEmptyHeaderEntry,
  headersToHistoryEntries,
  headersToRecord,
  historyEntriesToHeaders,
  recordToHeaders,
  type HeaderEntry,
  type HistoryHeaderEntry,
} from '@/utils/headers';

import { SENSITIVE_HEADER_NAMES } from '@/utils/redact';

/**
 * Partially mask a secret for display, keeping a short prefix/suffix so the
 * user can recognize which credential is in use without exposing it fully.
 */
export function maskSecretForDisplay(secret: string): string {
  if (!secret) return secret;
  if (secret.length <= 8) return '••••••••';
  return `${secret.slice(0, 4)}••••••••${secret.slice(-2)}`;
}

/**
 * Mask a header value for read-only display in the response inspector. Handles
 * `Bearer <token>` values and any credential-bearing header name.
 */
export function maskHeaderValueForDisplay(key: string, value: string): string {
  if (!value) return value;
  if (value.startsWith('Bearer ')) {
    const token = value.slice(7);
    return token ? `Bearer ${maskSecretForDisplay(token)}` : value;
  }
  if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) {
    return maskSecretForDisplay(value);
  }
  return value;
}

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
