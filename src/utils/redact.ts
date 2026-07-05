export const REDACTED_VALUE = 'REDACTED';

/**
 * Header names whose values are always credentials and must never be persisted
 * or exported in the clear. Compared case-insensitively.
 */
export const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'x-api-key',
  'x-goog-api-key',
  'api-key',
]);

/**
 * Redact credential header values. Sensitive header names are replaced
 * wholesale; when the caller knows the API key, any header value that embeds it
 * (e.g. a custom auth header) is scrubbed too.
 */
export function redactHeaders<T extends Record<string, string> | null>(
  headers: T,
  apiKey?: string,
): T {
  if (!headers) return headers;
  const redacted = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => {
      if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) {
        return [key, REDACTED_VALUE];
      }
      if (apiKey && value.includes(apiKey)) {
        return [key, redactApiKeyInString(value, apiKey)];
      }
      return [key, value];
    }),
  );
  return redacted as T;
}

/**
 * Replace occurrences of the API key (raw and URL-encoded) in a string with the
 * redaction placeholder. Used for URLs that carry the key as a query parameter.
 */
export function redactApiKeyInString<T extends string | null | undefined>(
  value: T,
  apiKey: string | undefined,
): T {
  if (!value || !apiKey) return value;
  return value
    .replaceAll(apiKey, REDACTED_VALUE)
    .replaceAll(encodeURIComponent(apiKey), REDACTED_VALUE) as T;
}

/**
 * Query-parameter names that carry credentials (e.g. Gemini's `?key=`).
 * Compared case-insensitively.
 */
export const SENSITIVE_QUERY_PARAMS = new Set([
  'key',
  'api_key',
  'apikey',
  'access_token',
  'token',
]);

/**
 * Redact credential values embedded as query parameters in a URL. Used when the
 * exact API key is not available (e.g. exports), so redaction is keyed off the
 * parameter name rather than the value.
 */
export function redactUrlQueryParams<T extends string | null>(url: T): T {
  if (!url) return url;
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return url;

  const base = url.slice(0, queryIndex);
  const query = url.slice(queryIndex + 1);
  const redactedQuery = query
    .split('&')
    .map((pair) => {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) return pair;
      const name = pair.slice(0, eqIndex);
      return SENSITIVE_QUERY_PARAMS.has(name.toLowerCase())
        ? `${name}=${REDACTED_VALUE}`
        : pair;
    })
    .join('&');

  return `${base}?${redactedQuery}` as T;
}
