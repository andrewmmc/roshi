import { useProviders } from '@/hooks/use-providers';
import { useProviderStore } from '@/stores/provider-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export function ProviderSelect() {
  const {
    providers,
    selectedProviderId,
    selectedModelId,
    selectProvider,
    selectModel,
    getSelectedProvider,
    getSelectedModel,
  } = useProviders();
  const seeding = useProviderStore((s) => s.seeding);

  const selectedProvider = getSelectedProvider();
  const selectedModel = getSelectedModel();

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
        <SelectTrigger className="h-7 w-[160px] text-xs">
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

      <Select value={selectedModelId || ''} onValueChange={selectModel}>
        <SelectTrigger className="h-7 w-[200px] text-xs">
          <SelectValue placeholder="Model">
            {selectedModel?.displayName ?? 'Model'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {selectedProvider?.models.length ? (
            selectedProvider.models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
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
