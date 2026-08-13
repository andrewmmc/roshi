import { Boxes, MessageSquareText, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useProviderStore, useSelectedProvider } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import {
  selectedProviderNeedsApiKey,
  selectedProviderNeedsModel,
} from '@/utils/onboarding';

export function ResponseEmptyState() {
  const providers = useProviderStore((s) => s.providers);
  const selectedProvider = useSelectedProvider();
  const openProviderSettings = useUiStore((s) => s.openProviderSettings);
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
    <EmptyState
      icon={needsApiKey ? Server : needsModel ? Boxes : MessageSquareText}
      title={message}
      actions={
        <>
          {needsApiKey && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                openProviderSettings(selectedProvider?.id ?? null, true)
              }
            >
              <Server className="h-3 w-3" />
              Add API key
            </Button>
          )}
          {needsModel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openModelMarket(selectedProvider?.id ?? null)}
            >
              <Boxes className="h-3 w-3" />
              Pick a model
            </Button>
          )}
        </>
      }
    />
  );
}
