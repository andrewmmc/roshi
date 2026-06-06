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
  it('falls back to editable defaults when capabilities are missing', () => {
    expect(isParamEditable(undefined, false, true)).toBe(true);
    expect(getParamMin(undefined, 0)).toBe(0);
    expect(getParamMax(undefined, 2)).toBe(2);
    expect(getDisabledReason(undefined, false)).toBeUndefined();
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
      reason: 'Frequency penalty is not supported by Anthropic.',
    };

    expect(isParamEditable(support, true, true)).toBe(false);
    expect(getDisabledReason(support, true)).toBe(support.reason);
    expect(getDisabledReason(undefined, true)).toBe(
      'Not supported by the selected model.',
    );
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
