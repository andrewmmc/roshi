import { describe, expect, it } from 'vitest';
import {
  createDefaultParamEnabled,
  LEGACY_PARAM_ENABLED,
  paramEnabledFromRequest,
  resolveParamEnabled,
} from './optional-params';

describe('optional-params', () => {
  it('defaults all optional params to disabled', () => {
    expect(createDefaultParamEnabled()).toEqual({
      temperature: false,
      maxTokens: false,
      topP: false,
      topK: false,
      frequencyPenalty: false,
      presencePenalty: false,
    });
  });

  it('fills missing enable flags from the legacy fallback', () => {
    expect(resolveParamEnabled(undefined)).toEqual(LEGACY_PARAM_ENABLED);
    expect(resolveParamEnabled({ temperature: false })).toEqual({
      ...LEGACY_PARAM_ENABLED,
      temperature: false,
    });
  });

  it('derives enable flags from which request fields were present', () => {
    expect(
      paramEnabledFromRequest({
        temperature: 0.7,
        maxTokens: undefined,
        topP: 1,
        topK: 0,
        frequencyPenalty: undefined,
        presencePenalty: 0.1,
      }),
    ).toEqual({
      temperature: true,
      maxTokens: false,
      topP: true,
      topK: false,
      frequencyPenalty: false,
      presencePenalty: true,
    });
  });
});
