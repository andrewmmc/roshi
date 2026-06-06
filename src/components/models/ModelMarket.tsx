import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BuiltInProviderSection } from '@/components/models/built-in-provider-section';
import { CustomProviderSection } from '@/components/models/custom-provider-section';
import { ProviderFilterChips } from '@/components/models/provider-filter-chips';
import { ResetModelsDialog } from '@/components/models/reset-models-dialog';
import { useProviderStore } from '@/stores/provider-store';
import { useModelCatalogStore } from '@/stores/model-catalog-store';
import { useUiStore } from '@/stores/ui-store';
import { sortProvidersByName } from '@/utils/sort-providers';
import { builtinProviders } from '@/providers/builtins';
import type { ProviderConfig } from '@/types/provider';

const BUILTIN_NAMES = new Set(builtinProviders.map((p) => p.name));

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
  const providers = useProviderStore((s) => s.providers);
  const loaded = useProviderStore((s) => s.loaded);
  const seeding = useProviderStore((s) => s.seeding);
  const loadProviders = useProviderStore((s) => s.load);
  const resetAllProviders = useProviderStore((s) => s.resetAllProviders);
  const refreshModelCatalog = useProviderStore((s) => s.refreshModelCatalog);
  const refreshing = useProviderStore((s) => s.refreshingCatalog);
  const catalogStatus = useModelCatalogStore((s) => s.status);
  const loadCatalog = useModelCatalogStore((s) => s.load);
  const filterProviderId = useUiStore((s) => s.settingsModelsProviderId);
  const setFilterProviderId = useUiStore((s) => s.setSettingsModelsProviderId);

  const [search, setSearch] = useState('');
  const [resettingAll, setResettingAll] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    if (!loaded) {
      void loadProviders();
    }
  }, [loaded, loadProviders]);

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

  useEffect(() => {
    if (filterProviderId && !sorted.some((p) => p.id === filterProviderId)) {
      setFilterProviderId(null);
    }
  }, [filterProviderId, sorted, setFilterProviderId]);

  const handleRefresh = async () => {
    await refreshModelCatalog();
  };

  const handleResetAll = async () => {
    setResettingAll(true);
    try {
      await resetAllProviders();
      setShowResetDialog(false);
    } finally {
      setResettingAll(false);
    }
  };

  if (!loaded || seeding) {
    return (
      <div className="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-xs">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading providers…
      </div>
    );
  }

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
        onResetAll={() => setShowResetDialog(true)}
        onRefresh={() => void handleRefresh()}
        onClose={onClose}
      />

      {showResetDialog ? (
        <ResetModelsDialog
          open={showResetDialog}
          resetting={resettingAll}
          onOpenChange={setShowResetDialog}
          onConfirm={() => void handleResetAll()}
        />
      ) : null}
    </div>
  );
}
