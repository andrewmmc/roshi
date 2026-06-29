import { Boxes, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProviderStore, useSelectedProvider } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import {
  selectedProviderNeedsApiKey,
  selectedProviderNeedsModel,
} from '@/utils/onboarding';

export function ResponseEmptyState() {
  const providers = useProviderStore((s) => s.providers);
  const selectedProvider = useSelectedProvider();
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const openModelMarket = useUiStore((s) => s.openModelMarket);

  const hasProviders = providers.length > 0;
  const needsApiKey =
    !hasProviders || selectedProviderNeedsApiKey(selectedProvider);
  const needsModel = selectedProviderNeedsModel(selectedProvider);
  const message = !hasProviders
    ? 'Add a provider API key to send your first request.'
    : needsApiKey
      ? `Add an API key for ${selectedProvider?.name ?? 'this provider'} before sending.`
      : needsModel
        ? `Pick a model for ${selectedProvider?.name ?? 'this provider'} before sending.`
        : 'Write a message, then send the request to see the response here.';

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-muted-foreground text-[13px]">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {needsApiKey && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSettingsOpen(true, 'providers')}
          >
            <Server className="mr-1.5 h-3 w-3" />
            Add API key
          </Button>
        )}
        {needsModel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => openModelMarket(selectedProvider?.id ?? null)}
          >
            <Boxes className="mr-1.5 h-3 w-3" />
            Pick a model
          </Button>
        )}
      </div>
    </div>
  );
}
