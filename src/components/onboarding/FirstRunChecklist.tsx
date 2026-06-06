import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import {
  hasConfiguredApiKey,
  hasPickedModel,
  isFirstRunSetupIncomplete,
} from '@/utils/onboarding';
import { cn } from '@/lib/utils';

const SAMPLE_PROMPT =
  'Explain what an LLM API request looks like in one short paragraph.';

export function FirstRunChecklist() {
  const providers = useProviderStore((s) => s.providers);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const openModelMarket = useUiStore((s) => s.openModelMarket);
  const updateMessage = useComposerStore((s) => s.updateMessage);
  const addMessage = useComposerStore((s) => s.addMessage);
  const messages = useComposerStore((s) => s.messages);

  if (!isFirstRunSetupIncomplete(providers)) {
    return null;
  }

  const apiKeyDone = hasConfiguredApiKey(providers);
  const modelDone = hasPickedModel(providers);

  const handleSamplePrompt = () => {
    const firstUserIndex = messages.findIndex(
      (message) => message.role === 'user',
    );
    if (firstUserIndex >= 0) {
      updateMessage(firstUserIndex, {
        ...messages[firstUserIndex],
        content: SAMPLE_PROMPT,
      });
      return;
    }
    addMessage({ role: 'user', content: SAMPLE_PROMPT });
  };

  const steps = [
    {
      id: 'api-key',
      label: 'Add a provider API key',
      complete: apiKeyDone,
      actionLabel: 'Open Providers',
      onAction: () => setSettingsOpen(true, 'providers'),
      visible: true,
    },
    {
      id: 'model',
      label: 'Pick at least one model',
      complete: modelDone,
      actionLabel: 'Browse Models',
      onAction: () => openModelMarket(),
      visible: true,
    },
    {
      id: 'send',
      label: 'Send a sample prompt',
      complete: false,
      actionLabel: 'Insert sample',
      onAction: handleSamplePrompt,
      visible: apiKeyDone && modelDone,
    },
  ];

  return (
    <div className="border-border/70 bg-muted/20 shrink-0 border-b px-4 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-foreground text-xs font-medium">
            Get started with Roshi
          </p>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            Complete these steps to send your first request.
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
                      'truncate text-[11px]',
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
                    size="sm"
                    className="h-6 shrink-0 px-2 text-[10px]"
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
