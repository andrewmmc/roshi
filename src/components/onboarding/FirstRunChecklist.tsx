import { CheckCircle2, Circle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useComposerStore } from '@/stores/composer-store';
import { useProviderStore, useSelectedProvider } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import {
  hasConfiguredApiKey,
  hasPickedModel,
  isFirstRunSetupIncomplete,
} from '@/utils/onboarding';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

export function FirstRunChecklist() {
  const { t } = useTranslation();
  const providers = useProviderStore((s) => s.providers);
  const selectedProvider = useSelectedProvider();
  const openProviderSettings = useUiStore((s) => s.openProviderSettings);
  const openModelMarket = useUiStore((s) => s.openModelMarket);
  const checklistOpen = useUiStore((s) => s.checklistOpen);
  const setChecklistOpen = useUiStore((s) => s.setChecklistOpen);
  const updateMessage = useComposerStore((s) => s.updateMessage);
  const addMessage = useComposerStore((s) => s.addMessage);
  const messages = useComposerStore((s) => s.messages);

  const setupIncomplete = isFirstRunSetupIncomplete(providers);
  if (!setupIncomplete && !checklistOpen) {
    return null;
  }

  const apiKeyDone = hasConfiguredApiKey(providers);
  const modelDone = hasPickedModel(providers);
  const showCloseButton = checklistOpen && !setupIncomplete;
  const setupProvider = selectedProvider ?? providers[0] ?? null;

  const handleSamplePrompt = () => {
    const firstUserIndex = messages.findIndex(
      (message) => message.role === 'user',
    );
    if (firstUserIndex >= 0) {
      updateMessage(firstUserIndex, {
        ...messages[firstUserIndex],
        content: t('onboarding.samplePrompt'),
      });
      return;
    }
    addMessage({ role: 'user', content: t('onboarding.samplePrompt') });
  };

  const steps = [
    {
      id: 'api-key',
      label: t('onboarding.stepApiKey'),
      complete: apiKeyDone,
      actionLabel: t('onboarding.actionAddApiKey'),
      onAction: () => openProviderSettings(setupProvider?.id ?? null, true),
      visible: true,
    },
    {
      id: 'model',
      label: t('onboarding.stepModel'),
      complete: modelDone,
      actionLabel: t('onboarding.actionBrowseModels'),
      onAction: () => openModelMarket(setupProvider?.id ?? null),
      visible: true,
    },
    {
      id: 'send',
      label: t('onboarding.stepSend'),
      complete: false,
      actionLabel: t('onboarding.actionInsertSample'),
      onAction: handleSamplePrompt,
      visible: apiKeyDone && modelDone,
    },
  ];

  return (
    <div className="border-border/70 bg-muted/20 relative shrink-0 border-b px-4 py-2.5">
      {showCloseButton && (
        <button
          type="button"
          aria-label={t('onboarding.closeChecklist')}
          onClick={() => setChecklistOpen(false)}
          className="text-muted-foreground/60 hover:text-muted-foreground absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-foreground text-[13px] font-medium">
            {t('onboarding.title')}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            {t('onboarding.subtitle')}
          </p>
        </div>
        <ol className="flex min-w-[280px] flex-1 flex-col gap-1.5 sm:max-w-xl">
          {steps
            .filter((step) => step.visible)
            .map((step) => (
              <li
                key={step.id}
                className="flex items-center justify-between gap-2 px-1 py-0.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {step.complete ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" />
                  )}
                  <span
                    className={cn(
                      'truncate text-[13px]',
                      step.complete
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!step.complete && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="shrink-0"
                    onClick={step.onAction}
                  >
                    {step.actionLabel}
                  </Button>
                )}
              </li>
            ))}
        </ol>
      </div>
    </div>
  );
}
