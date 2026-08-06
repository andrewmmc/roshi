import { describe, expect, it } from 'vitest';
import {
  buildCompatibleRequestFromComposer,
  buildNormalizedRequestFromComposer,
  type ComposerRequestFields,
} from './build-normalized-request';
import { makeProvider, makeModel, makeMessage } from '@/__tests__/fixtures';
import {
  createDefaultParamEnabled,
  LEGACY_PARAM_ENABLED,
} from '@/types/optional-params';

function makeComposerFields(
  overrides: Partial<ComposerRequestFields> = {},
): ComposerRequestFields {
  return {
    messages: [makeMessage({ role: 'user', content: 'Hello' })],
    systemPrompt: '',
    temperature: 1,
    maxTokens: 4096,
    topP: 1,
    topK: 0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    paramEnabled: { ...LEGACY_PARAM_ENABLED },
    stream: true,
    thinkingEnabled: false,
    thinkingBudgetTokens: 1024,
    effort: 'medium',
    verbosity: 'medium',
    ...overrides,
  };
}

describe('build-normalized-request', () => {
  it('builds a normalized request from composer fields', () => {
    const request = buildNormalizedRequestFromComposer(
      makeComposerFields({
        systemPrompt: 'Be helpful',
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
      }),
      'gpt-4',
    );

    expect(request.model).toBe('gpt-4');
    expect(request.systemPrompt).toBe('Be helpful');
    expect(request.messages).toHaveLength(1);
    expect(request.temperature).toBe(0.7);
    expect(request.maxTokens).toBe(100);
  });

  it('omits optional params when they are not enabled', () => {
    const request = buildNormalizedRequestFromComposer(
      makeComposerFields({
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
        topK: 40,
        frequencyPenalty: 0.2,
        presencePenalty: 0.3,
        paramEnabled: createDefaultParamEnabled(),
      }),
      'gpt-4',
    );

    expect(request.temperature).toBeUndefined();
    expect(request.maxTokens).toBeUndefined();
    expect(request.topP).toBeUndefined();
    expect(request.topK).toBeUndefined();
    expect(request.frequencyPenalty).toBeUndefined();
    expect(request.presencePenalty).toBeUndefined();
  });

  it('includes only the optional params the user enabled', () => {
    const request = buildNormalizedRequestFromComposer(
      makeComposerFields({
        temperature: 0.5,
        maxTokens: 2048,
        topK: 20,
        paramEnabled: {
          ...createDefaultParamEnabled(),
          temperature: true,
          maxTokens: true,
        },
      }),
      'gpt-4',
    );

    expect(request.temperature).toBe(0.5);
    expect(request.maxTokens).toBe(2048);
    expect(request.topP).toBeUndefined();
    expect(request.topK).toBeUndefined();
  });

  it('filters unsupported params for model capabilities', () => {
    const provider = makeProvider({
      id: 'o1',
      models: [makeModel({ id: 'gpt-5.5-pro' })],
    });

    const compatibility = buildCompatibleRequestFromComposer({
      composer: makeComposerFields({
        thinkingEnabled: true,
        thinkingBudgetTokens: 2048,
      }),
      messages: [makeMessage({ role: 'user', content: 'Hello' })],
      model: provider.models[0],
      provider,
      selectedModelId: 'gpt-5.5-pro',
    });

    expect(compatibility.request.stream).toBe(false);
    expect(compatibility.warnings.length).toBeGreaterThan(0);
  });

  it('uses selectedModelId when model metadata is missing and honors stream overrides', () => {
    const provider = makeProvider({
      models: [makeModel({ id: 'gpt-4o', supportsStreaming: true })],
    });

    const compatibility = buildCompatibleRequestFromComposer({
      composer: makeComposerFields({
        stream: false,
      }),
      messages: [makeMessage({ role: 'user', content: 'Hello' })],
      model: null,
      provider,
      selectedModelId: 'gpt-4o',
      streamOverride: true,
    });

    expect(compatibility.request.model).toBe('gpt-4o');
    expect(compatibility.request.stream).toBe(true);
  });
});
