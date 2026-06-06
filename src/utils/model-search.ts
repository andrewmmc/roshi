import type { ProviderModel } from '@/types/provider';

export function matchesModelSearch(
  model: Pick<ProviderModel, 'id' | 'displayName' | 'name'>,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    model.id.toLowerCase().includes(normalized) ||
    model.displayName.toLowerCase().includes(normalized) ||
    model.name.toLowerCase().includes(normalized)
  );
}

export function filterModelsBySearch<T extends ProviderModel>(
  models: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return models;
  return models.filter((model) => matchesModelSearch(model, normalized));
}
