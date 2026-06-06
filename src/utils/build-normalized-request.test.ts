import { describe, expect, it } from 'vitest';
import {
  buildCompatibleRequestFromComposer,
  buildNormalizedRequestFromComposer,
} from './build-normalized-request';
import { makeProvider, makeModel, makeMessage } from '@/__tests__/fixtures';

describe('build-normalized-request', () => {
  it('builds a normalized request from composer fields', () => {
    const request = buildNormalizedRequestFromComposer(
      {
        messages: [makeMessage({ role: 'user', content: 'Hello' })],
        systemPrompt: 'Be helpful',
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
        topK: 0,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stream: true,
        thinkingEnabled: false,
        thinkingBudgetTokens: 1024,
        effort: 'medium',
        verbosity: 'medium',
      },
      'gpt-4',
    );

    expect(request.model).toBe('gpt-4');
    expect(request.systemPrompt).toBe('Be helpful');
    expect(request.messages).toHaveLength(1);
  });

  it('filters unsupported params for model capabilities', () => {
    const provider = makeProvider({
      id: 'o1',
      models: [makeModel({ id: 'gpt-5.5-pro' })],
    });

    const compatibility = buildCompatibleRequestFromComposer({
      composer: {
        messages: [makeMessage({ role: 'user', content: 'Hello' })],
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
        topP: 1,
        topK: 0,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stream: true,
        thinkingEnabled: true,
        thinkingBudgetTokens: 2048,
        effort: 'medium',
        verbosity: 'medium',
      },
      messages: [makeMessage({ role: 'user', content: 'Hello' })],
      model: provider.models[0],
      provider,
      selectedModelId: 'gpt-5.5-pro',
    });

    expect(compatibility.request.stream).toBe(false);
    expect(compatibility.warnings.length).toBeGreaterThan(0);
  });
});
