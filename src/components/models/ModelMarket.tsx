import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProviders } from '@/hooks/use-providers';
import { useProviderStore } from '@/stores/provider-store';
import { useModelCatalogStore } from '@/stores/model-catalog-store';
import { useUiStore } from '@/stores/ui-store';
import { sortProvidersByName } from '@/utils/sort-providers';
import { builtinProviders } from '@/providers/builtins';
import type { ProviderConfig, ProviderModel } from '@/types/provider';

const BUILTIN_NAMES = new Set(builtinProviders.map((p) => p.name));

function formatContextTokens(tokens?: number): string | null {
  if (!tokens) return null;
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M ctx`;
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K ctx`;
  }
  return `${tokens} ctx`;
}

function ModelCapabilityBadges({ model }: { model: ProviderModel }) {
  const context = formatContextTokens(model.capabilities?.tokenLimits?.context);
  const modalities = model.capabilities?.inputModalities ?? [];
  const nonTextModalities = modalities.filter((m) => m !== 'text');
  return (
    <div className="flex flex-wrap items-center gap-1">
      {context && (
        <Badge variant="outline" className="text-[10px]">
          {context}
        </Badge>
      )}
      {nonTextModalities.map((m) => (
        <Badge key={m} variant="ghost" className="text-[10px] capitalize">
          {m}
        </Badge>
      ))}
    </div>
  );
}

function CatalogRow({
  model,
  added,
  busy,
  onAdd,
  onRemove,
}: {
  model: ProviderModel;
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="border-border/60 bg-background/80 flex items-center gap-3 rounded-xl border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium tracking-tight">
            {model.displayName || model.name || model.id}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <code className="text-muted-foreground truncate font-mono text-[11px]">
            {model.id}
          </code>
        </div>
        <div className="mt-1.5">
          <ModelCapabilityBadges model={model} />
        </div>
      </div>
      <div className="shrink-0">
        {added ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={busy}
            onClick={onRemove}
            aria-label={`Remove ${model.displayName || model.id}`}
          >
            <Check className="h-3 w-3" />
            Added
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={busy}
            onClick={onAdd}
            aria-label={`Add ${model.displayName || model.id}`}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}

function BuiltInProviderSection({
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.displayName.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q),
    );
  }, [catalog, search]);

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

function CustomProviderSection({
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return provider.models;
    return provider.models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.displayName.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q),
    );
  }, [provider.models, search]);

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

function ProviderFilterChips({
  providers,
  activeProviderId,
  onChange,
}: {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
          activeProviderId === null
            ? 'border-foreground/20 bg-foreground/5 text-foreground'
            : 'border-border text-muted-foreground hover:text-foreground',
        )}
      >
        All
      </button>
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
            activeProviderId === p.id
              ? 'border-foreground/20 bg-foreground/5 text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

export function ModelMarketFooter({
  resettingAll,
  refreshing,
  onResetAll,
  onRefresh,
  onClose,
}: {
  resettingAll: boolean;
  refreshing: boolean;
  onResetAll: () => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-muted/15 flex shrink-0 items-center justify-between border-t px-5 py-4">
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive text-xs"
        disabled={resettingAll}
        onClick={onResetAll}
      >
        <RotateCcw className="mr-1 h-3 w-3" />
        {resettingAll ? 'Resetting…' : 'Reset picks'}
      </Button>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw
            className={cn('mr-1 h-3 w-3', refreshing && 'animate-spin')}
          />
          {refreshing ? 'Refreshing…' : 'Refresh catalogue'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export function ModelMarket({
  onClose,
  onEditProvider,
}: {
  onClose: () => void;
  onEditProvider: (provider: ProviderConfig) => void;
}) {
  const { providers, resetAllProviders, refreshModelCatalog } = useProviders();
  const refreshing = useProviderStore((s) => s.refreshingCatalog);
  const catalogStatus = useModelCatalogStore((s) => s.status);
  const loadCatalog = useModelCatalogStore((s) => s.load);
  const filterProviderId = useUiStore((s) => s.settingsModelsProviderId);
  const setFilterProviderId = useUiStore((s) => s.setSettingsModelsProviderId);

  const [search, setSearch] = useState('');
  const [resettingAll, setResettingAll] = useState(false);

  useEffect(() => {
    if (catalogStatus === 'idle') {
      void loadCatalog();
    }
  }, [catalogStatus, loadCatalog]);

  const sorted = useMemo(() => sortProvidersByName(providers), [providers]);
  const visible = useMemo(
    () =>
      filterProviderId
        ? sorted.filter((p) => p.id === filterProviderId)
        : sorted,
    [sorted, filterProviderId],
  );

  // If the filtered provider was deleted, clear the filter.
  useEffect(() => {
    if (filterProviderId && !sorted.some((p) => p.id === filterProviderId)) {
      setFilterProviderId(null);
    }
  }, [filterProviderId, sorted, setFilterProviderId]);

  const handleRefresh = async () => {
    await refreshModelCatalog();
  };

  const handleResetAll = async () => {
    if (
      !window.confirm(
        'Reset all picked models? This clears your model picks for every built-in provider.',
      )
    ) {
      return;
    }
    setResettingAll(true);
    try {
      await resetAllProviders();
    } finally {
      setResettingAll(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="bg-muted/20 shrink-0 border-b px-5 py-4">
        <h2 className="text-[15px] font-medium tracking-tight">Models</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Pick the models you want available in the composer. Refreshing the
          catalogue never changes the models you have already added.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models…"
              className="h-8 pr-7 pl-7 text-xs"
              aria-label="Search models"
            />
            {search && (
              <IconButton
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
                tooltip="Clear search"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </IconButton>
            )}
          </div>
          <ProviderFilterChips
            providers={sorted}
            activeProviderId={filterProviderId}
            onChange={setFilterProviderId}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 px-5 py-4">
          {visible.length === 0 && (
            <div className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-xs">
              No providers configured.
            </div>
          )}
          {visible.map((provider) =>
            provider.isBuiltIn && BUILTIN_NAMES.has(provider.name) ? (
              <BuiltInProviderSection
                key={provider.id}
                provider={provider}
                search={search}
              />
            ) : (
              <CustomProviderSection
                key={provider.id}
                provider={provider}
                search={search}
                onEditProvider={onEditProvider}
              />
            ),
          )}
        </div>
      </div>

      <ModelMarketFooter
        resettingAll={resettingAll}
        refreshing={refreshing}
        onResetAll={() => void handleResetAll()}
        onRefresh={() => void handleRefresh()}
        onClose={onClose}
      />
    </div>
  );
}
