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

function formatPreviewValue(value: string | null, masked: boolean): string {
  if (value === null) return '—';
  if (masked) return maskSecretValue(value);
  return value || '—';
}

export function EnvironmentPreviewButton({
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
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

  const messages = useComposerStore((s) => s.messages);
  const systemPrompt = useComposerStore((s) => s.systemPrompt);
  const customHeaders = useComposerStore((s) => s.customHeaders);
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
        tooltip="Preview environment variables"
        aria-label="Preview environment variables"
        onClick={() => handleOpenChange(true)}
      >
        <Eye className="h-3 w-3" />
      </IconButton>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Environment preview</SheetTitle>
            <SheetDescription>
              Resolved placeholders for{' '}
              {preview.environmentName ?? 'no environment selected'}.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {!preview.hasPlaceholders ? (
              <p className="text-muted-foreground px-2 py-2 text-xs">
                No {'{{variable}}'} placeholders in the current request.
              </p>
            ) : preview.variables.length === 0 ? (
              <p className="text-muted-foreground px-2 py-2 text-xs">
                Placeholders found, but no variables are defined in the selected
                environment.
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
                        {variable.status}
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
                Missing variables: {preview.missingVariables.join(', ')}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
