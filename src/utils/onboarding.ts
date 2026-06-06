import type { ProviderConfig } from '@/types/provider';

export function hasConfiguredApiKey(providers: ProviderConfig[]): boolean {
  return providers.some(
    (provider) => (provider.apiKey ?? '').trim().length > 0,
  );
}

export function hasPickedModel(providers: ProviderConfig[]): boolean {
  return providers.some((provider) => provider.models.length > 0);
}

export function isFirstRunSetupIncomplete(
  providers: ProviderConfig[],
): boolean {
  return !hasConfiguredApiKey(providers) || !hasPickedModel(providers);
}

export function selectedProviderNeedsApiKey(
  provider: ProviderConfig | null,
): boolean {
  return provider !== null && (provider.apiKey ?? '').trim().length === 0;
}

export function selectedProviderNeedsModel(
  provider: ProviderConfig | null,
): boolean {
  return provider !== null && provider.models.length === 0;
}
