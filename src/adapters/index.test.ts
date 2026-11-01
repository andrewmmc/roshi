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

  it('uses Responses adapter for OpenAI GPT-5 family models', () => {
    expect(
      getAdapter(
        makeProvider({
          name: 'OpenAI',
          type: 'openai-compatible',
          protocol: 'openai-chat-completions',
        }),
        'gpt-5.5',
      ),
    ).toBe(openaiResponsesAdapter);
  });

  it.each([
    'o1-pro',
    'o3-pro-2025-06-10',
    'o3-deep-research',
    'o4-mini-deep-research',
    'codex-mini-latest',
    'computer-use-preview',
  ])('uses Responses adapter for Responses-only OpenAI model %s', (model) => {
    expect(
      getAdapter(
        makeProvider({
          name: 'OpenAI',
          type: 'openai-compatible',
          protocol: 'openai-chat-completions',
        }),
        model,
      ),
    ).toBe(openaiResponsesAdapter);
  });

  it.each(['o3', 'o4-mini', 'gpt-4.1'])(
    'keeps chat adapter for Chat Completions OpenAI model %s',
    (model) => {
      expect(
        getAdapter(
          makeProvider({
            name: 'OpenAI',
            type: 'openai-compatible',
            protocol: 'openai-chat-completions',
          }),
          model,
        ),
      ).toBe(openaiAdapter);
    },
  );

  it('keeps chat adapter for non-OpenAI GPT-5-compatible providers', () => {
    expect(
      getAdapter(
        makeProvider({
          name: 'OpenRouter',
          type: 'openai-compatible',
          protocol: 'openai-compatible-chat',
        }),
        'gpt-5.5',
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
