import type { ProviderConfig } from '@/types/provider';
import {
  isSensitiveHeaderName,
  REDACTED_VALUE,
  redactApiKeyInString,
  SENSITIVE_QUERY_PARAMS,
} from '@/utils/redact';

/** Sanitize a copy before export or persistence; never alter live credentials. */
export function redactExportData<T>(
  data: T,
  providers: ProviderConfig[],
  additionalSecrets: readonly string[] = [],
): T {
  const names = new Set<string>();
  const secrets = new Set<string>(additionalSecrets.filter(Boolean));
  for (const provider of providers) {
    if (provider.apiKey) secrets.add(provider.apiKey);
    if (provider.auth.headerName) {
      names.add(provider.auth.headerName.toLowerCase());
    }
  }
  const sensitive = (name: string) =>
    names.has(name.trim().toLowerCase()) ||
    isSensitiveHeaderName(name) ||
    name.toLowerCase() === 'apikey';

  for (const provider of providers) {
    for (const [name, value] of Object.entries(provider.customHeaders ?? {})) {
      if (sensitive(name) && value) secrets.add(value);
    }
  }
  // Replace longer values first so overlapping keys cannot leave suffixes.
  const orderedSecrets = [...secrets].sort((a, b) => b.length - a.length);
  const scrubString = (value: string) => {
    for (const secret of orderedSecrets) {
      value = redactApiKeyInString(value, secret);
    }
    return value;
  };
  const scrubUrl = (value: string) => {
    // Also support relative provider endpoints without changing URL formatting.
    return value
      .replace(/^(https?:\/\/)[^/@]+@/i, '$1REDACTED@')
      .replace(
        /([?&])([^=&#]+)=([^&#]*)/g,
        (pair, separator: string, name: string) => {
          let decoded: string;
          try {
            decoded = decodeURIComponent(name).toLowerCase();
          } catch {
            return pair;
          }
          return sensitive(decoded) || SENSITIVE_QUERY_PARAMS.has(decoded)
            ? `${separator}${name}=${REDACTED_VALUE}`
            : pair;
        },
      );
  };
  const visit = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const scrubbed = scrubString(value);
      return /^(https?:\/\/|\/)/i.test(scrubbed)
        ? scrubUrl(scrubbed)
        : scrubbed;
    }
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object' || value instanceof Date)
      return value;
    const record = value as Record<string, unknown>;
    const isSecretEntry =
      typeof record.key === 'string' && sensitive(record.key);
    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [
        key,
        typeof item === 'string' &&
        item &&
        (sensitive(key) || (key === 'value' && isSecretEntry))
          ? REDACTED_VALUE
          : visit(item),
      ]),
    );
  };
  return visit(data) as T;
}
