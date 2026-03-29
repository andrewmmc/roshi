import { getAdapter } from './index';
import { openaiAdapter } from './openai';
import { makeProvider } from '@/__tests__/fixtures';

describe('getAdapter', () => {
  it('returns openai adapter for openai-compatible', () => {
    expect(getAdapter(makeProvider({ type: 'openai-compatible' }))).toBe(
      openaiAdapter,
    );
  });

  it('returns openai adapter for custom', () => {
    expect(getAdapter(makeProvider({ type: 'custom' }))).toBe(openaiAdapter);
  });

  it('returns openai adapter for anthropic (fallback)', () => {
    expect(getAdapter(makeProvider({ type: 'anthropic' }))).toBe(openaiAdapter);
  });

  it('returns openai adapter for google-gemini (fallback)', () => {
    expect(getAdapter(makeProvider({ type: 'google-gemini' }))).toBe(
      openaiAdapter,
    );
  });
});
