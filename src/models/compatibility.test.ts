import type { ModelCapabilities } from './capabilities';
import { filterRequestByCapabilities } from './compatibility';
import { gpt5FamilyCapabilities, gpt55ProCapabilities } from './registry';
import { makeRequest } from '@/__tests__/fixtures';

describe('filterRequestByCapabilities', () => {
  it('omits unsupported GPT-5 legacy sampling params', () => {
    const result = filterRequestByCapabilities(
      makeRequest({
        model: 'gpt-5.5',
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
        maxTokens: 2048,
      }),
      gpt5FamilyCapabilities,
    );

    expect(result.request.temperature).toBeUndefined();
    expect(result.request.topP).toBeUndefined();
    expect(result.request.frequencyPenalty).toBeUndefined();
    expect(result.request.presencePenalty).toBeUndefined();
    expect(result.request.maxTokens).toBe(2048);
    expect(result.omittedParams.map((p) => p.param)).toEqual([
      'temperature',
      'topP',
      'frequencyPenalty',
      'presencePenalty',
    ]);
    expect(result.warnings).toEqual([
      'Temperature was omitted: Use reasoning effort and verbosity controls for GPT-5 models.',
      'Top P was omitted: Use reasoning effort and verbosity controls for GPT-5 models.',
      'Frequency penalty was omitted: Legacy sampling penalties are not a GPT-5 control surface.',
      'Presence penalty was omitted: Legacy sampling penalties are not a GPT-5 control surface.',
    ]);
  });

  it('disables streaming when the model does not support it', () => {
    const result = filterRequestByCapabilities(
      makeRequest({ model: 'gpt-5.5-pro', stream: true }),
      gpt55ProCapabilities,
    );

    expect(result.request.stream).toBe(false);
    expect(result.omittedParams).toContainEqual({
      param: 'stream',
      reason: 'Streaming is not supported by this model.',
    });
  });

  it('omits default-only params instead of sending stale UI values', () => {
    const capabilities: ModelCapabilities = {
      streaming: true,
      inputModalities: ['text'],
      outputModalities: ['text'],
      params: {
        temperature: {
          supported: 'default-only',
          default: 1,
          reason: 'Temperature must use the model default.',
        },
        maxTokens: { supported: true, wireName: 'max_tokens' },
      },
    };

    const result = filterRequestByCapabilities(
      makeRequest({ temperature: 1 }),
      capabilities,
    );

    expect(result.request.temperature).toBeUndefined();
    expect(result.omittedParams).toContainEqual({
      param: 'temperature',
      reason: 'Temperature must use the model default.',
    });
  });

  it('omits thinking controls when unsupported', () => {
    const result = filterRequestByCapabilities(
      makeRequest({ thinking: { enabled: true, budgetTokens: 1024 } }),
      gpt5FamilyCapabilities,
    );

    expect(result.request.thinking).toBeUndefined();
    expect(result.omittedParams).toContainEqual({
      param: 'thinking',
      reason: 'Thinking controls are not supported by this model.',
    });
  });

  it('keeps supported effort and verbosity values', () => {
    const result = filterRequestByCapabilities(
      makeRequest({
        model: 'gpt-5.5',
        temperature: undefined,
        effort: 'high',
        verbosity: 'low',
      }),
      gpt5FamilyCapabilities,
    );

    expect(result.request.effort).toBe('high');
    expect(result.request.verbosity).toBe('low');
    expect(result.omittedParams).toEqual([]);
  });

  it('omits unsupported effort and verbosity values', () => {
    const result = filterRequestByCapabilities(
      makeRequest({
        model: 'gpt-5.5',
        temperature: undefined,
        effort: 'extreme',
        verbosity: 'silent',
      }),
      gpt5FamilyCapabilities,
    );

    expect(result.request.effort).toBeUndefined();
    expect(result.request.verbosity).toBeUndefined();
    expect(result.warnings).toEqual([
      'Effort was omitted: Effort is not supported by this model.',
      'Verbosity was omitted: Verbosity is not supported by this model.',
    ]);
  });
});
