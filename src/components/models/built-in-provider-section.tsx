import { useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CatalogRow } from '@/components/models/catalog-row';
import { useProviderStore } from '@/stores/provider-store';
import { useModelCatalogStore } from '@/stores/model-catalog-store';
import { filterModelsBySearch } from '@/utils/model-search';
import type { ProviderConfig, ProviderModel } from '@/types/provider';

export function BuiltInProviderSection({
  provider,
  search,
}: {
  provider: ProviderConfig;
  search: string;
}) {
  const catalog = useModelCatalogStore((s) => s.models[provider.name] ?? []);
  const status = useModelCatalogStore((s) => s.status);
  const error = useModelCatalogStore((s) => s.error);
  const load = useModelCatalogStore((s) => s.load);
  const addModelToProvider = useProviderStore((s) => s.addModelToProvider);
  const removeModelFromProvider = useProviderStore(
    (s) => s.removeModelFromProvider,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);

  const pickedIds = useMemo(
    () => new Set(provider.models.map((m) => m.id)),
    [provider.models],
  );

  const filtered = useMemo(
    () => filterModelsBySearch(catalog, search),
    [catalog, search],
  );

  const isLoading = status === 'loading' && catalog.length === 0;
  const isError = status === 'error';

  const handleAdd = async (model: ProviderModel) => {
    setPendingId(model.id);
    try {
      await addModelToProvider(provider.id, model);
    } finally {
      setPendingId(null);
    }
  };

  const handleRemove = async (modelId: string) => {
    setPendingId(modelId);
    try {
      await removeModelFromProvider(provider.id, modelId);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-2">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium tracking-tight">{provider.name}</h3>
        <span className="text-muted-foreground text-[11px]">
          {pickedIds.size} of {catalog.length} added
        </span>
      </header>

      {isLoading && (
        <div className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed px-3 py-4 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading catalogue…
        </div>
      )}

      {isError && (
        <div className="text-muted-foreground flex items-center justify-between rounded-xl border border-dashed px-3 py-4 text-xs">
          <span className="flex items-center gap-2">
            <AlertCircle className="text-destructive h-3.5 w-3.5" />
            Failed to load catalogue{error ? `: ${error}` : '.'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => void load(true)}
          >
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-muted-foreground rounded-xl border border-dashed px-3 py-4 text-center text-xs">
          {catalog.length === 0
            ? 'No models available from the catalogue.'
            : 'No models match your search.'}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((model) => (
          <CatalogRow
            key={model.id}
            model={model}
            added={pickedIds.has(model.id)}
            busy={pendingId === model.id}
            onAdd={() => void handleAdd(model)}
            onRemove={() => void handleRemove(model.id)}
          />
        ))}
      </div>
    </section>
  );
}
