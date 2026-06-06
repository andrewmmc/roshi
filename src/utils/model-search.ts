import type { ProviderModel } from '@/types/provider';

export function matchesModelSearch(
  model: Pick<ProviderModel, 'id' | 'displayName' | 'name'>,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const id = model.id.toLowerCase();
  const displayName = (model.displayName ?? '').toLowerCase();
  const name = (model.name ?? '').toLowerCase();
  return (
    id.includes(normalized) ||
    displayName.includes(normalized) ||
    name.includes(normalized)
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
