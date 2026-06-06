import { useMemo } from 'react';
import { Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useProviderStore } from '@/stores/provider-store';
import { filterModelsBySearch } from '@/utils/model-search';
import type { ProviderConfig } from '@/types/provider';

export function CustomProviderSection({
  provider,
  search,
  onEditProvider,
}: {
  provider: ProviderConfig;
  search: string;
  onEditProvider: (provider: ProviderConfig) => void;
}) {
  const removeModelFromProvider = useProviderStore(
    (s) => s.removeModelFromProvider,
  );

  const filtered = useMemo(
    () => filterModelsBySearch(provider.models, search),
    [provider.models, search],
  );

  return (
    <section className="space-y-2">
      <header className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium tracking-tight">
            {provider.name}
          </h3>
          <span className="text-muted-foreground text-[11px]">Custom</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground gap-1 text-xs"
          onClick={() => onEditProvider(provider)}
        >
          <SettingsIcon className="h-3 w-3" />
          Edit provider
        </Button>
      </header>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed px-3 py-4 text-center text-xs">
          {provider.models.length === 0
            ? 'No models defined. Edit the provider to add custom models.'
            : 'No models match your search.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((model) => (
            <div
              key={model.id}
              className="border-border/60 bg-background/80 flex items-center gap-3 rounded-xl border px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium tracking-tight">
                  {model.displayName || model.id}
                </div>
                <code className="text-muted-foreground mt-0.5 block truncate font-mono text-[11px]">
                  {model.id}
                </code>
              </div>
              <IconButton
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive shrink-0"
                tooltip="Remove model"
                aria-label={`Remove ${model.displayName || model.id}`}
                onClick={() =>
                  void removeModelFromProvider(provider.id, model.id)
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
