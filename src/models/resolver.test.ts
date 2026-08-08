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

  it('uses Responses API defaults for unknown response models', () => {
    const capabilities = resolveModelCapabilities(
      makeProvider({
        protocol: 'openai-responses',
        models: [makeModel({ id: 'custom-response-model' })],
      }),
      'custom-response-model',
    );

    expect(capabilities.params.temperature?.supported).toBe(true);
    expect(capabilities.params.topP?.supported).toBe(true);
    expect(capabilities.params.frequencyPenalty?.supported).toBe(false);
    expect(capabilities.params.presencePenalty?.supported).toBe(false);
    expect(capabilities.params.maxTokens?.wireName).toBe('max_output_tokens');
  });

  it('merges model metadata capabilities into provider defaults', () => {
    const provider = makeProvider({
      models: [
        makeModel({
          id: 'custom-model',
          capabilities: {
            inputModalities: ['text', 'image'],
            tokenLimits: { context: 128_000, output: 16_000 },
          },
        }),
      ],
    });

    const capabilities = resolveModelCapabilities(provider, 'custom-model');

    expect(capabilities.inputModalities).toEqual(['text', 'image']);
    expect(capabilities.tokenLimits).toEqual({
      context: 128_000,
      output: 16_000,
    });
    expect(capabilities.params.temperature?.supported).toBe(true);
  });

  it('lets exact registry overrides win over model metadata quirks', () => {
    const capabilities = resolveModelCapabilities(
      makeProvider({
        models: [
          makeModel({
            id: 'gpt-5.5-pro',
            capabilities: { streaming: true },
          }),
        ],
      }),
      'gpt-5.5-pro',
    );

    expect(capabilities.streaming).toBe(false);
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

  it('uses adaptive thinking and effort for Claude 5 models', () => {
    const capabilities = resolveModelCapabilities(
      makeProvider({ type: 'anthropic' }),
      'claude-sonnet-5',
    );

    expect(capabilities.params.thinking?.modes).toEqual(['adaptive']);
    expect(capabilities.params.effort?.levels).toContain('max');
    expect(capabilities.params.temperature?.supported).toBe(false);
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

  it('includes current reasoning effort levels for GPT-5.6', () => {
    const capabilities = resolveModelCapabilities(makeProvider(), 'gpt-5.6');

    expect(capabilities.params.effort?.levels).toContain('minimal');
    expect(capabilities.params.effort?.levels).toContain('max');
    expect(capabilities.params.reasoningMode).toEqual({
      levels: ['standard', 'pro'],
      defaultLevel: 'standard',
      wireName: 'reasoning.mode',
    });
  });

  it('uses reasoning chat capabilities for o-series models', () => {
    const capabilities = resolveModelCapabilities(makeProvider(), 'o3-mini');

    expect(capabilities.params.temperature?.supported).toBe(false);
    expect(capabilities.params.maxTokens?.wireName).toBe(
      'max_completion_tokens',
    );
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

  it('uses thinking levels for Gemini 3 models', () => {
    const capabilities = resolveModelCapabilities(
      makeProvider({ type: 'google-gemini' }),
      'gemini-3.6-flash',
    );

    expect(capabilities.params.thinking?.modes).toEqual(['adaptive']);
    expect(capabilities.params.effort).toEqual({
      levels: ['minimal', 'low', 'medium', 'high'],
      defaultLevel: 'medium',
      wireName: 'generationConfig.thinkingConfig.thinkingLevel',
    });
  });

  it('limits Gemini 3.1 Pro to its supported thinking levels', () => {
    const capabilities = resolveModelCapabilities(
      makeProvider({ type: 'google-gemini' }),
      'gemini-3.1-pro',
    );

    expect(capabilities.params.effort?.levels).toEqual([
      'low',
      'medium',
      'high',
    ]);
    expect(capabilities.params.effort?.defaultLevel).toBe('high');
  });

  it('respects selected model streaming metadata for Gemini model IDs', () => {
    const capabilities = resolveModelCapabilities(
      makeProvider({
        type: 'google-gemini',
        models: [
          makeModel({ id: 'gemini-2.5-pro-preview', supportsStreaming: false }),
        ],
      }),
      'gemini-2.5-pro-preview',
    );

    expect(capabilities.streaming).toBe(false);
    expect(capabilities.params.maxTokens?.wireName).toBe('maxOutputTokens');
  });
});
