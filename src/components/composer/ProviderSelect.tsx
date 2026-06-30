import { useEffect } from 'react';
import {
  useProviderStore,
  useSelectedModel,
  useSelectedProvider,
} from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { supportsModelSelection } from '@/types/provider';
import { sortProvidersByName } from '@/utils/sort-providers';

const ADD_PROVIDER_VALUE = '__add_provider__';
const BROWSE_MODELS_VALUE = '__browse_models__';

export function ProviderSelect() {
  const providers = useProviderStore((s) => s.providers);
  const selectedProviderId = useProviderStore((s) => s.selectedProviderId);
  const selectedModelId = useProviderStore((s) => s.selectedModelId);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);
  const loaded = useProviderStore((s) => s.loaded);
  const seeding = useProviderStore((s) => s.seeding);
  const load = useProviderStore((s) => s.load);
  const openModelMarket = useUiStore((s) => s.openModelMarket);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const selectedProvider = useSelectedProvider();
  const selectedModel = useSelectedModel();

  useEffect(() => {
    if (!loaded) {
      load();
    }
  }, [loaded, load]);

  if (seeding) {
    return (
      <div className="text-muted-foreground flex h-7 items-center gap-2 px-2 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading providers…
      </div>
    );
  }

  const providerSupportsModels = supportsModelSelection(
    selectedProvider?.type ?? 'openai-compatible',
  );
  const hasModels = (selectedProvider?.models.length ?? 0) > 0;
  const showBrowseModels = Boolean(selectedProvider && providerSupportsModels);
  const handleProviderChange = (value: string | null) => {
    if (value === ADD_PROVIDER_VALUE) {
      setSettingsOpen(true, 'providers');
      return;
    }

    selectProvider(value);
  };
  const handleModelChange = (value: string | null) => {
    if (value === BROWSE_MODELS_VALUE) {
      openModelMarket(selectedProvider?.id ?? null);
      return;
    }

    selectModel(value);
  };

  return (
    <div className="flex min-w-0 flex-1 basis-[420px] gap-2">
      <Select
        value={selectedProviderId || ''}
        onValueChange={handleProviderChange}
      >
        <SelectTrigger
          aria-label="Select provider"
          title="Select provider"
          className="h-7 w-[150px] min-w-[90px] shrink-0 text-xs"
        >
          <SelectValue placeholder="Provider">
            {selectedProvider?.name ?? 'Provider'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-52">
          {sortProvidersByName(providers).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
          {providers.length ? <SelectSeparator /> : null}
          <SelectItem value={ADD_PROVIDER_VALUE}>
            <Plus />
            Add provider
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={selectedModelId || ''}
        onValueChange={handleModelChange}
        disabled={!providerSupportsModels}
      >
        <SelectTrigger
          aria-label="Select model"
          className="h-7 min-w-[160px] flex-1 text-xs"
          title={selectedModel?.displayName}
        >
          <SelectValue placeholder="Model">
            {selectedModel?.displayName ?? 'Model'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-64">
          {hasModels ? (
            selectedProvider?.models.map((m) => (
              <SelectItem key={m.id} value={m.id} title={m.displayName}>
                {m.displayName}
              </SelectItem>
            ))
          ) : (
            <div className="text-muted-foreground px-2 py-3 text-center text-xs">
              No models available.
            </div>
          )}
          {showBrowseModels ? (
            <>
              <SelectSeparator />
              <SelectItem value={BROWSE_MODELS_VALUE}>
                <Plus />
                Browse models
              </SelectItem>
            </>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}
