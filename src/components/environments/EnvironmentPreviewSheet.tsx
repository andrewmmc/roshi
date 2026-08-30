import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useComposerStore } from '@/stores/composer-store';
import { useEnvironmentStore } from '@/stores/environment-store';
import { buildEnvironmentPreview, maskSecretValue } from '@/utils/variables';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { NormalizedMessage } from '@/types/normalized';
import type { HeaderEntry } from '@/utils/headers';

function formatPreviewValue(value: string | null, masked: boolean): string {
  if (value === null) return '—';
  if (masked) return maskSecretValue(value);
  return value || '—';
}

export function EnvironmentPreviewButton({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  messages: messagesProp,
  systemPrompt: systemPromptProp,
  customHeaders: customHeadersProp,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Defaults to the Request composer; pass explicitly to preview another composer (e.g. Eval). */
  messages?: NormalizedMessage[];
  systemPrompt?: string;
  customHeaders?: HeaderEntry[];
} = {}) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const handleOpenChange = (next: boolean) => {
    if (isControlled) {
      onOpenChangeProp?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  const composerMessages = useComposerStore((s) => s.messages);
  const composerSystemPrompt = useComposerStore((s) => s.systemPrompt);
  const composerCustomHeaders = useComposerStore((s) => s.customHeaders);
  const messages = messagesProp ?? composerMessages;
  const systemPrompt = systemPromptProp ?? composerSystemPrompt;
  const customHeaders = customHeadersProp ?? composerCustomHeaders;
  const environment = useEnvironmentStore((s) => s.getSelectedEnvironment());

  const preview = useMemo(
    () =>
      buildEnvironmentPreview({
        messages,
        systemPrompt,
        customHeaders,
        environment,
      }),
    [messages, systemPrompt, customHeaders, environment],
  );

  const hasMissing = preview.missingVariables.length > 0;

  return (
    <>
      <IconButton
        variant="ghost"
        size="icon-sm"
        className={cn(
          hasMissing
            ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400'
            : 'text-muted-foreground hover:text-foreground',
        )}
        tooltip={t('environments.previewTooltip')}
        aria-label={t('environments.previewTooltip')}
        onClick={() => handleOpenChange(true)}
      >
        <Eye className="h-3 w-3" />
      </IconButton>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          className="w-full duration-100 sm:max-w-md"
          overlayClassName="duration-100"
        >
          <SheetHeader>
            <SheetTitle>{t('environments.previewTitle')}</SheetTitle>
            <SheetDescription>
              {t('environments.previewDescription', {
                name:
                  preview.environmentName ??
                  t('environments.noEnvironmentSelected'),
              })}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!preview.hasPlaceholders ? (
              <p className="text-muted-foreground px-2 py-2 text-xs">
                {t('environments.noPlaceholders')}
              </p>
            ) : preview.variables.length === 0 ? (
              <p className="text-muted-foreground px-2 py-2 text-xs">
                {t('environments.noVariablesDefined')}
              </p>
            ) : (
              <div className="space-y-2">
                {preview.variables.map((variable) => (
                  <div
                    key={variable.key}
                    className={cn(
                      'rounded-lg border px-3 py-2',
                      variable.status === 'missing' &&
                        'border-amber-500/40 bg-amber-500/5',
                      variable.status === 'unused' && 'opacity-70',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-medium">
                        {variable.key}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase',
                          variable.status === 'resolved' &&
                            'bg-green-500/10 text-green-700 dark:text-green-300',
                          variable.status === 'missing' &&
                            'bg-amber-500/10 text-amber-700 dark:text-amber-300',
                          variable.status === 'unused' &&
                            'bg-muted text-muted-foreground',
                        )}
                      >
                        {t(
                          variable.status === 'resolved'
                            ? 'environments.statusResolved'
                            : variable.status === 'missing'
                              ? 'environments.statusMissing'
                              : 'environments.statusUnused',
                        )}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 font-mono text-[11px] break-all">
                      {formatPreviewValue(
                        variable.resolvedValue,
                        variable.masked,
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hasMissing && (
              <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">
                {t('environments.missingVariables', {
                  list: preview.missingVariables.join(', '),
                })}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
