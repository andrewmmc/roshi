import { describe, expect, it } from 'vitest';
import { buildModelCompatibilitySummary } from './model-compatibility-summary';
import { defaultCapabilitiesForProviderType } from '@/models/capabilities';
import { gpt6FamilyCapabilities } from '@/models/registry';

describe('model-compatibility-summary', () => {
  it('recognizes GPT reasoning effort as thinking support', () => {
    const summary = buildModelCompatibilitySummary(
      gpt6FamilyCapabilities,
      String,
    );
    expect(
      summary.find((item) => item.labelKey === 'request.thinking'),
    ).toMatchObject({ supported: true, valueKey: 'request.supported' });
  });
  it('summarizes streaming, images, thinking, and token limits', () => {
    const summary = buildModelCompatibilitySummary(
      defaultCapabilitiesForProviderType('anthropic'),
      (value) => value.toLocaleString('en-US'),
    );

    expect(summary.map((item) => item.labelKey)).toEqual([
      'request.paramLabelStream',
      'request.paramLabelImages',
      'request.thinking',
      'request.paramLabelContext',
      'request.paramLabelMaxOutput',
    ]);
    expect(summary[0]?.valueKey).toBe('request.supported');
    expect(summary[1]?.valueKey).toBe('request.supported');
  });
});
