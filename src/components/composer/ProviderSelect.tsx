import { useProviders } from '@/hooks/use-providers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ProviderSelect() {
  const { providers, selectedProviderId, selectedModelId, selectProvider, selectModel, getSelectedProvider } =
    useProviders();

  const selectedProvider = getSelectedProvider();
  const hasProviders = providers.length > 0;

  return (
    <div className="flex gap-2">
      <Select value={selectedProviderId || ''} onValueChange={selectProvider}>
        <SelectTrigger className="w-[160px] h-7 text-xs">
          <SelectValue placeholder="Provider" />
        </SelectTrigger>
        <SelectContent>
          {hasProviders ? (
            providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No providers configured.
              <br />
              Add one in Settings.
            </div>
          )}
        </SelectContent>
      </Select>

      <Select value={selectedModelId || ''} onValueChange={selectModel}>
        <SelectTrigger className="w-[200px] h-7 text-xs">
          <SelectValue placeholder="Model" />
        </SelectTrigger>
        <SelectContent>
          {selectedProvider?.models.length ? (
            selectedProvider.models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.displayName}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              {hasProviders ? 'No models available.' : 'Configure a provider first.'}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
