import { describe, expect, it } from 'vitest';
import {
  hasConfiguredApiKey,
  hasPickedModel,
  isFirstRunSetupIncomplete,
  selectedProviderNeedsApiKey,
  selectedProviderNeedsModel,
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

  it('treats whitespace-only API keys as missing', () => {
    const providers = [makeProvider({ apiKey: '   ', models: [makeModel()] })];

    expect(hasConfiguredApiKey(providers)).toBe(false);
    expect(isFirstRunSetupIncomplete(providers)).toBe(true);
  });

  it('detects when the selected provider still needs setup', () => {
    const provider = makeProvider({ apiKey: '', models: [] });

    expect(selectedProviderNeedsApiKey(provider)).toBe(true);
    expect(selectedProviderNeedsModel(provider)).toBe(true);
    expect(selectedProviderNeedsApiKey(null)).toBe(false);
    expect(selectedProviderNeedsModel(null)).toBe(false);
  });

  it('detects configured selected providers', () => {
    const provider = makeProvider({
      apiKey: 'sk-test',
      models: [makeModel()],
    });

    expect(selectedProviderNeedsApiKey(provider)).toBe(false);
    expect(selectedProviderNeedsModel(provider)).toBe(false);
  });
});
