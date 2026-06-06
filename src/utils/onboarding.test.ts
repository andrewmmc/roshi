import { describe, expect, it } from 'vitest';
import {
  hasConfiguredApiKey,
  hasPickedModel,
  isFirstRunSetupIncomplete,
} from './onboarding';
import { makeProvider, makeModel } from '@/__tests__/fixtures';

describe('onboarding utils', () => {
  it('detects missing API keys and models', () => {
    expect(
      isFirstRunSetupIncomplete([makeProvider({ apiKey: '', models: [] })]),
    ).toBe(true);
  });

  it('considers setup complete when key and model exist', () => {
    const providers = [
      makeProvider({
        apiKey: 'sk-test',
        models: [makeModel()],
      }),
    ];

    expect(hasConfiguredApiKey(providers)).toBe(true);
    expect(hasPickedModel(providers)).toBe(true);
    expect(isFirstRunSetupIncomplete(providers)).toBe(false);
  });
});
