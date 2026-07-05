import { describe, expect, it } from 'vitest';
import {
  extractErrorMessage,
  mapAnthropicUsage,
  mergeUsage,
  parseTopLevelStreamError,
} from './shared';

describe('mapAnthropicUsage', () => {
  it('returns null when usage is missing', () => {
    expect(mapAnthropicUsage(undefined)).toBeNull();
  });

  it('maps a complete usage object', () => {
    expect(mapAnthropicUsage({ input_tokens: 10, output_tokens: 5 })).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it('tolerates a missing input_tokens (message_delta shape)', () => {
    expect(mapAnthropicUsage({ output_tokens: 15 })).toEqual({
      promptTokens: 0,
      completionTokens: 15,
      totalTokens: 15,
    });
  });

  it('tolerates a missing output_tokens (message_start shape)', () => {
    expect(mapAnthropicUsage({ input_tokens: 100 })).toEqual({
      promptTokens: 100,
      completionTokens: 0,
      totalTokens: 100,
    });
  });
});

describe('mergeUsage', () => {
  it('returns prev when next is null', () => {
    const prev = { promptTokens: 1, completionTokens: 2, totalTokens: 3 };
    expect(mergeUsage(prev, null)).toBe(prev);
  });

  it('returns next when prev is null', () => {
    const next = { promptTokens: 1, completionTokens: 2, totalTokens: 3 };
    expect(mergeUsage(null, next)).toBe(next);
  });

  it('merges Anthropic split usage into a correct total', () => {
    const start = { promptTokens: 100, completionTokens: 0, totalTokens: 100 };
    const delta = { promptTokens: 0, completionTokens: 42, totalTokens: 42 };
    expect(mergeUsage(start, delta)).toEqual({
      promptTokens: 100,
      completionTokens: 42,
      totalTokens: 142,
    });
  });

  it('keeps the largest reported total (e.g. reasoning tokens)', () => {
    const prev = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
    const next = { promptTokens: 10, completionTokens: 20, totalTokens: 50 };
    expect(mergeUsage(prev, next)).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 50,
    });
  });
});

describe('extractErrorMessage', () => {
  it('returns a non-empty string as-is', () => {
    expect(extractErrorMessage('boom')).toBe('boom');
  });

  it('prefers the message field of an object', () => {
    expect(extractErrorMessage({ message: 'bad', type: 'x' })).toBe('bad');
  });

  it('falls back to the type field', () => {
    expect(extractErrorMessage({ type: 'overloaded' })).toBe('overloaded');
  });

  it('stringifies objects without message/type', () => {
    expect(extractErrorMessage({ code: 429 })).toBe('{"code":429}');
  });

  it('returns the fallback for non-string primitives', () => {
    expect(extractErrorMessage(42, 'fallback')).toBe('fallback');
    expect(extractErrorMessage('   ', 'fallback')).toBe('fallback');
  });

  it('returns the fallback when JSON.stringify throws', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(extractErrorMessage(circular, 'fallback')).toBe('fallback');
  });
});

describe('parseTopLevelStreamError', () => {
  it('extracts a top-level error message', () => {
    expect(
      parseTopLevelStreamError(JSON.stringify({ error: { message: 'nope' } })),
    ).toBe('nope');
  });

  it('returns null when there is no error field', () => {
    expect(parseTopLevelStreamError(JSON.stringify({ ok: true }))).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseTopLevelStreamError('not-json')).toBeNull();
  });
});
