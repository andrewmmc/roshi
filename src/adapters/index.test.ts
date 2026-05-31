import { getAdapter } from './index';
import { openaiAdapter } from './openai';
import { openaiResponsesAdapter } from './openai-responses';
import { anthropicAdapter } from './anthropic';
import { geminiAdapter } from './gemini';
import { makeProvider } from '@/__tests__/fixtures';

describe('getAdapter', () => {
  it('returns openai adapter for openai-compatible', () => {
    expect(getAdapter(makeProvider({ type: 'openai-compatible' }))).toBe(
      openaiAdapter,
    );
  });

  it('returns OpenAI Responses adapter for responses protocol', () => {
    expect(
      getAdapter(
        makeProvider({
          type: 'openai-compatible',
          protocol: 'openai-responses',
        }),
      ),
    ).toBe(openaiResponsesAdapter);
  });

  it('returns chat adapter for OpenAI chat completions protocol', () => {
    expect(
      getAdapter(
        makeProvider({
          type: 'openai-compatible',
          protocol: 'openai-chat-completions',
        }),
      ),
    ).toBe(openaiAdapter);
  });

  it('returns anthropic adapter for anthropic', () => {
    expect(getAdapter(makeProvider({ type: 'anthropic' }))).toBe(
      anthropicAdapter,
    );
  });

  it('returns gemini adapter for google-gemini', () => {
    expect(getAdapter(makeProvider({ type: 'google-gemini' }))).toBe(
      geminiAdapter,
    );
  });
});
