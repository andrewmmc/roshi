import { useEffect } from 'react';
import {
  useProviderStore,
  useSelectedModel,
  useSelectedProvider,
} from '@/stores/provider-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supportsModelSelection } from '@/types/provider';

export function ProviderSelect() {
  const providers = useProviderStore((s) => s.providers);
  const selectedProviderId = useProviderStore((s) => s.selectedProviderId);
  const selectedModelId = useProviderStore((s) => s.selectedModelId);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);
  const loaded = useProviderStore((s) => s.loaded);
  const seeding = useProviderStore((s) => s.seeding);
  const load = useProviderStore((s) => s.load);
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

  return (
    <div className="flex gap-2">
      <Select value={selectedProviderId || ''} onValueChange={selectProvider}>
        <SelectTrigger
          aria-label="Select provider"
          title="Select provider"
          className="h-7 w-[160px] text-xs"
        >
          <SelectValue placeholder="Provider">
            {selectedProvider?.name ?? 'Provider'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {providers.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* TODO: Support model selection for Google Gemini (currently uses model ID in URL path) */}
      <Select
        value={selectedModelId || ''}
        onValueChange={selectModel}
        disabled={
          !supportsModelSelection(selectedProvider?.type ?? 'openai-compatible')
        }
      >
        <SelectTrigger
          aria-label="Select model"
          className="h-7 w-[280px] text-xs"
          title={selectedModel?.displayName}
        >
          <SelectValue placeholder="Model">
            {selectedModel?.displayName ?? 'Model'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {selectedProvider?.models.length ? (
            selectedProvider.models.map((m) => (
              <SelectItem key={m.id} value={m.id} title={m.displayName}>
                {m.displayName}
              </SelectItem>
            ))
          ) : (
            <div className="text-muted-foreground px-2 py-3 text-center text-xs">
              No models available.
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
