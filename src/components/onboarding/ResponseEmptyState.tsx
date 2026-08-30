import { Boxes, MessageSquareText, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useProviderStore, useSelectedProvider } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { useTranslation } from '@/i18n';
import {
  selectedProviderNeedsApiKey,
  selectedProviderNeedsModel,
} from '@/utils/onboarding';

export function ResponseEmptyState() {
  const { t } = useTranslation();
  const providers = useProviderStore((s) => s.providers);
  const selectedProvider = useSelectedProvider();
  const openProviderSettings = useUiStore((s) => s.openProviderSettings);
  const openModelMarket = useUiStore((s) => s.openModelMarket);

  const hasProviders = providers.length > 0;
  const needsApiKey =
    !hasProviders || selectedProviderNeedsApiKey(selectedProvider);
  const needsModel = selectedProviderNeedsModel(selectedProvider);
  const providerName = selectedProvider?.name ?? t('common.unknown');
  const message = !hasProviders
    ? t('onboarding.emptyNoProviders')
    : needsApiKey
      ? t('onboarding.emptyNeedsApiKey', { name: providerName })
      : needsModel
        ? t('onboarding.emptyNeedsModel', { name: providerName })
        : t('onboarding.emptyWriteMessage');

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
              {t('onboarding.actionAddApiKey')}
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
              {t('onboarding.actionPickModel')}
            </Button>
          )}
        </>
      }
    />
  );
}
