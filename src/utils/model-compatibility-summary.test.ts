import { describe, expect, it } from 'vitest';
import { buildModelCompatibilitySummary } from './model-compatibility-summary';
import { defaultCapabilitiesForProviderType } from '@/models/capabilities';

describe('model-compatibility-summary', () => {
  it('summarizes streaming, images, thinking, and token limits', () => {
    const summary = buildModelCompatibilitySummary(
      defaultCapabilitiesForProviderType('anthropic'),
    );

    expect(summary.map((item) => item.label)).toEqual([
      'Streaming',
      'Images',
      'Thinking',
      'Context',
      'Max output',
    ]);
    expect(summary[0]?.value).toBe('Supported');
    expect(summary[1]?.value).toBe('Supported');
  });
});
