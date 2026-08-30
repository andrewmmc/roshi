import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BuiltInProviderSection } from '@/components/models/built-in-provider-section';
import { CustomProviderSection } from '@/components/models/custom-provider-section';
import { ProviderFilterChips } from '@/components/models/provider-filter-chips';
import { useProviderStore } from '@/stores/provider-store';
import { useModelCatalogStore } from '@/stores/model-catalog-store';
import { useUiStore } from '@/stores/ui-store';
import { sortProvidersByName } from '@/utils/sort-providers';
import { builtinProviders } from '@/providers/builtins';
import type { ProviderConfig } from '@/types/provider';
import { loadStoreSafely } from '@/stores/load-error';
import { useTranslation } from '@/i18n';

const BUILTIN_NAMES = new Set(builtinProviders.map((p) => p.name));

export function ModelMarketFooter({
  refreshing,
  onRefresh,
  onClose,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-muted/15 flex shrink-0 items-center justify-between border-t px-5 py-4">
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
        {refreshing ? t('refreshing') : t('refreshCatalog')}
      </Button>
      <Button type="button" variant="outline" onClick={onClose}>
        {t('close')}
      </Button>
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
  const { t } = useTranslation();
  const providers = useProviderStore((s) => s.providers);
  const loaded = useProviderStore((s) => s.loaded);
  const seeding = useProviderStore((s) => s.seeding);
  const loadProviders = useProviderStore((s) => s.load);
  const refreshModelCatalog = useProviderStore((s) => s.refreshModelCatalog);
  const refreshing = useProviderStore((s) => s.refreshingCatalog);
  const catalogStatus = useModelCatalogStore((s) => s.status);
  const loadCatalog = useModelCatalogStore((s) => s.load);
  const filterProviderId = useUiStore((s) => s.settingsModelsProviderId);
  const setFilterProviderId = useUiStore((s) => s.setSettingsModelsProviderId);

  const [search, setSearch] = useState('');
  const [addedOnly, setAddedOnly] = useState(false);

  useEffect(() => {
    if (!loaded) {
      loadStoreSafely('providers', loadProviders);
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

  if (!loaded || seeding) {
    return (
      <div className="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-xs">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('loadingProviders')}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="bg-muted/20 shrink-0 border-b px-5 py-4">
        <h2 className="text-[15px] font-medium tracking-tight">
          {t('models')}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t('modelsDescription')}
        </p>
      </div>

      <div className="shrink-0 border-b px-5 py-3">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchModels')}
            className="h-8 pr-7 pl-7 text-xs"
            aria-label={t('searchModelsLabel')}
          />
          {search && (
            <IconButton
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 -translate-y-1/2"
              tooltip={t('clearSearch')}
              onClick={() => setSearch('')}
              aria-label={t('clearSearch')}
            >
              <X className="h-3 w-3" />
            </IconButton>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <ProviderFilterChips
            providers={sorted}
            activeProviderId={filterProviderId}
            onChange={setFilterProviderId}
          />
          <div className="border-border/60 h-4 border-l" />
          <button
            type="button"
            onClick={() => setAddedOnly((v) => !v)}
            aria-pressed={addedOnly}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
              addedOnly
                ? 'border-foreground/20 bg-foreground/5 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {t('addedOnly')}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 px-5 py-4">
          {visible.length === 0 && (
            <div className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-xs">
              {t('noProvidersConfigured')}
            </div>
          )}
          {visible.map((provider) =>
            provider.isBuiltIn && BUILTIN_NAMES.has(provider.name) ? (
              <BuiltInProviderSection
                key={provider.id}
                provider={provider}
                search={search}
                addedOnly={addedOnly}
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
        refreshing={refreshing}
        onRefresh={() => void handleRefresh()}
        onClose={onClose}
      />
    </div>
  );
}
