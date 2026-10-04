import { describe, expect, it } from 'vitest';
import {
  getCapabilityAwareParameterDefaults,
  getCapabilitySupport,
  getDisabledReason,
  getParamMax,
  getParamMin,
  isParamEditable,
} from './parameter-control-utils';
import { defaultCapabilitiesForProviderType } from '@/models/capabilities';

describe('parameter-control-utils', () => {
  it('resets manual thinking to a budget below the default output limit', () => {
    const defaults = getCapabilityAwareParameterDefaults(
      defaultCapabilitiesForProviderType('anthropic'),
    );
    expect(defaults.thinkingBudgetTokens).toBe(1024);
    expect(defaults.thinkingBudgetTokens).toBeLessThan(defaults.maxTokens);
  });
  it('falls back to editable defaults when capabilities are missing', () => {
    expect(isParamEditable(undefined, false, true)).toBe(true);
    expect(getParamMin(undefined, 0)).toBe(0);
    expect(getParamMax(undefined, 2)).toBe(2);
    expect(getDisabledReason(undefined, false, (key) => key)).toBeUndefined();
  });

  it('respects capability support and bounds when present', () => {
    const capabilities =
      defaultCapabilitiesForProviderType('openai-compatible');
    const temperature = getCapabilitySupport(capabilities, 'temperature');

    expect(isParamEditable(temperature, true, false)).toBe(true);
    expect(getParamMin(temperature, 0)).toBe(0);
    expect(getParamMax(temperature, 2)).toBe(2);
  });

  it('returns provider-specific disabled reasons', () => {
    const support = {
      supported: false as const,
      reason: 'request.reasonResponsesNoFrequencyPenalty' as const,
    };

    expect(isParamEditable(support, true, true)).toBe(false);
    expect(getDisabledReason(support, true, (key) => key)).toBe(support.reason);
    expect(getDisabledReason(undefined, true, (key) => key)).toBe(
      'request.paramNotSupported',
    );
    expect(getDisabledReason({ supported: false }, true, (key) => key)).toBe(
      'request.paramNotSupported',
    );
  });

  it('returns default-only disabled reasons', () => {
    const support = {
      supported: 'default-only' as const,
      default: 1,
      reason: 'request.paramDefaultOnly' as const,
    };

    expect(getDisabledReason(support, true, (key) => key)).toBe(support.reason);
    expect(
      getDisabledReason(
        { supported: 'default-only', default: 1 },
        true,
        (key) => key,
      ),
    ).toBe('request.paramNotSupported');
  });

  it('builds capability-aware parameter defaults', () => {
    const capabilities =
      defaultCapabilitiesForProviderType('openai-compatible');

    expect(getCapabilityAwareParameterDefaults(capabilities)).toEqual(
      expect.objectContaining({
        temperature: 1,
        maxTokens: 4096,
        stream: true,
        effort: capabilities.params.effort?.defaultLevel ?? 'medium',
        verbosity: capabilities.params.verbosity?.defaultLevel ?? 'medium',
      }),
    );
  });
});
