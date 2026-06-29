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
  const handleModelChange = (value: string | null) => {
    if (value === BROWSE_MODELS_VALUE) {
      openModelMarket(selectedProvider?.id ?? null);
      return;
    }

    selectModel(value);
  };

  return (
    <div className="flex min-w-0 flex-1 gap-2">
      <Select value={selectedProviderId || ''} onValueChange={selectProvider}>
        <SelectTrigger
          aria-label="Select provider"
          title="Select provider"
          className="h-7 w-[160px] min-w-[90px] shrink text-xs"
        >
          <SelectValue placeholder="Provider">
            {selectedProvider?.name ?? 'Provider'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sortProvidersByName(providers).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedModelId || ''}
        onValueChange={handleModelChange}
        disabled={!providerSupportsModels}
      >
        <SelectTrigger
          aria-label="Select model"
          className="h-7 min-w-[100px] flex-1 text-xs"
          title={selectedModel?.displayName}
        >
          <SelectValue placeholder="Model">
            {selectedModel?.displayName ?? 'Model'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
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
              {hasModels ? <SelectSeparator /> : null}
              <SelectItem value={BROWSE_MODELS_VALUE}>
                <Plus className="h-3 w-3" />
                Browse models
              </SelectItem>
            </>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}
