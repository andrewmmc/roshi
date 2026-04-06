import type { ProviderConfig } from '@/types/provider';

/** Stable copy sorted A–Z by display name (case-insensitive). */
export function sortProvidersByName(
  providers: ProviderConfig[],
): ProviderConfig[] {
  return [...providers].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
