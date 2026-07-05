import { describe, expect, it } from 'vitest';
import {
  redactApiKeyInString,
  redactHeaders,
  redactUrlQueryParams,
} from './redact';

describe('redactHeaders', () => {
  it('passes through null', () => {
    expect(redactHeaders(null)).toBeNull();
  });

  it('redacts known sensitive header names case-insensitively', () => {
    expect(
      redactHeaders({
        Authorization: 'Bearer sk-123',
        'X-Api-Key': 'sk-123',
        'x-goog-api-key': 'sk-123',
        'Content-Type': 'application/json',
      }),
    ).toEqual({
      Authorization: 'REDACTED',
      'X-Api-Key': 'REDACTED',
      'x-goog-api-key': 'REDACTED',
      'Content-Type': 'application/json',
    });
  });

  it('scrubs the api key from custom header values when known', () => {
    expect(
      redactHeaders(
        { 'X-Custom-Auth': 'token sk-secret-999' },
        'sk-secret-999',
      ),
    ).toEqual({ 'X-Custom-Auth': 'token REDACTED' });
  });
});

describe('redactApiKeyInString', () => {
  it('replaces raw and encoded key occurrences', () => {
    expect(redactApiKeyInString('https://x/y?key=a b/c', 'a b/c')).toBe(
      'https://x/y?key=REDACTED',
    );
  });

  it('returns the value unchanged when no key is provided', () => {
    expect(redactApiKeyInString('https://x/y', undefined)).toBe('https://x/y');
  });

  it('passes through null/empty', () => {
    expect(redactApiKeyInString(null, 'k')).toBeNull();
  });
});

describe('redactUrlQueryParams', () => {
  it('redacts sensitive query params by name', () => {
    expect(
      redactUrlQueryParams('https://api/models/x:generate?key=SECRET&alt=sse'),
    ).toBe('https://api/models/x:generate?key=REDACTED&alt=sse');
  });

  it('leaves URLs without a query string untouched', () => {
    expect(redactUrlQueryParams('https://api/v1/chat')).toBe(
      'https://api/v1/chat',
    );
  });

  it('ignores non-sensitive params and valueless pairs', () => {
    expect(redactUrlQueryParams('https://api?alt=sse&flag')).toBe(
      'https://api?alt=sse&flag',
    );
  });

  it('passes through null', () => {
    expect(redactUrlQueryParams(null)).toBeNull();
  });
});
