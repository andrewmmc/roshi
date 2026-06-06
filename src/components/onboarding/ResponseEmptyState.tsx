import { Boxes, Send, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProviderStore, useSelectedProvider } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import {
  hasConfiguredApiKey,
  hasPickedModel,
  selectedProviderNeedsApiKey,
  selectedProviderNeedsModel,
} from '@/utils/onboarding';

export function ResponseEmptyState() {
  const providers = useProviderStore((s) => s.providers);
  const selectedProvider = useSelectedProvider();
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const openModelMarket = useUiStore((s) => s.openModelMarket);

  const needsApiKey =
    !hasConfiguredApiKey(providers) ||
    selectedProviderNeedsApiKey(selectedProvider);
  const needsModel =
    !hasPickedModel(providers) || selectedProviderNeedsModel(selectedProvider);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-muted-foreground text-[13px]">
        Select a model and send a request to see the response here.
      </p>
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
        {!needsApiKey && !needsModel && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <Send className="h-3 w-3" />
            Write a message above, then press Send.
          </p>
        )}
      </div>
    </div>
  );
}
