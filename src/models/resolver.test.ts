import { makeModel, makeProvider } from '@/__tests__/fixtures';
import { resolveModelCapabilities } from './resolver';

describe('resolveModelCapabilities', () => {
  it('uses provider model streaming metadata for unknown models', () => {
    const provider = makeProvider({
      models: [makeModel({ id: 'custom-model', supportsStreaming: false })],
    });

    const capabilities = resolveModelCapabilities(provider, 'custom-model');

    expect(capabilities.streaming).toBe(false);
    expect(capabilities.params.maxTokens?.wireName).toBe('max_tokens');
  });

  it('uses Opus 4.7+ capabilities for Claude Opus 4.7', () => {
    const capabilities = resolveModelCapabilities(
      makeProvider({ type: 'anthropic' }),
      'claude-opus-4-7',
    );

    expect(capabilities.streaming).toBe(true);
    expect(capabilities.params.temperature?.supported).toBe(false);
    expect(capabilities.params.thinking?.modes).toEqual(['adaptive']);
    expect(capabilities.params.effort?.wireName).toBe('output_config.effort');
  });

  it('uses Opus 4.7+ capabilities for future Claude Opus 4.x models', () => {
    const capabilities = resolveModelCapabilities(
      makeProvider({ type: 'anthropic' }),
      'claude-opus-4-8',
    );

    expect(capabilities.params.topP?.supported).toBe(false);
    expect(capabilities.params.maxTokens?.wireName).toBe('max_tokens');
  });

  it('uses GPT-5 capabilities for GPT-5.5', () => {
    const capabilities = resolveModelCapabilities(makeProvider(), 'gpt-5.5');

    expect(capabilities.streaming).toBe(true);
    expect(capabilities.params.maxTokens?.wireName).toBe(
      'max_completion_tokens',
    );
    expect(capabilities.params.effort?.wireName).toBe('reasoning.effort');
    expect(capabilities.params.verbosity?.wireName).toBe('text.verbosity');
  });

  it('disables streaming for GPT-5.5 Pro aliases and snapshots', () => {
    const provider = makeProvider({
      models: [
        makeModel({ id: 'gpt-5.5-pro' }),
        makeModel({ id: 'gpt-5.5-pro-2026-04-23' }),
      ],
    });

    expect(resolveModelCapabilities(provider, 'gpt-5.5-pro').streaming).toBe(
      false,
    );
    expect(
      resolveModelCapabilities(provider, 'gpt-5.5-pro-2026-04-23').streaming,
    ).toBe(false);
  });

  it('uses Gemini defaults for Gemini model IDs', () => {
    const capabilities = resolveModelCapabilities(
      makeProvider({ type: 'google-gemini' }),
      'gemini-2.5-pro',
    );

    expect(capabilities.streaming).toBe(true);
    expect(capabilities.params.maxTokens?.wireName).toBe('maxOutputTokens');
    expect(capabilities.inputModalities).toContain('video');
  });
});
