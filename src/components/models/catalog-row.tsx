import { useTranslation } from '@/i18n';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProviderModel } from '@/types/provider';
import type { ModelModality } from '@/models/capabilities';

type Translator = ReturnType<typeof useTranslation>['t'];

const MODALITY_LABELS: Record<
  Exclude<ModelModality, 'text'>,
  Parameters<Translator>[0]
> = {
  image: 'models.modalityImage',
  pdf: 'models.modalityPdf',
  audio: 'models.modalityAudio',
  video: 'models.modalityVideo',
};

function formatContextTokens(
  tokens: number | undefined,
  t: Translator,
): string | null {
  if (!tokens) return null;
  let value: string;
  if (tokens >= 1_000_000) {
    value = `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  } else if (tokens >= 1000) {
    value = `${Math.round(tokens / 1000)}K`;
  } else {
    value = String(tokens);
  }
  return t('models.contextTokens', { value });
}

function ModelCapabilityBadges({
  model,
  t,
}: {
  model: ProviderModel;
  t: Translator;
}) {
  const context = formatContextTokens(
    model.capabilities?.tokenLimits?.context,
    t,
  );
  const modalities = model.capabilities?.inputModalities ?? [];
  const nonTextModalities = modalities.filter(
    (m): m is Exclude<ModelModality, 'text'> => m !== 'text',
  );
  return (
    <div className="flex flex-wrap items-center gap-1">
      {context && (
        <Badge variant="outline" className="text-[11px]">
          {context}
        </Badge>
      )}
      {nonTextModalities.map((m) => (
        <Badge key={m} variant="ghost" className="text-[11px] capitalize">
          {t(MODALITY_LABELS[m])}
        </Badge>
      ))}
    </div>
  );
}

export function CatalogRow({
  model,
  added,
  busy,
  onAdd,
  onRemove,
}: {
  model: ProviderModel;
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-border/60 bg-background/80 flex items-center gap-3 rounded-xl border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium tracking-tight">
            {model.displayName || model.name || model.id}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <code className="text-muted-foreground truncate font-mono text-[11px]">
            {model.id}
          </code>
        </div>
        <div className="mt-1.5">
          <ModelCapabilityBadges model={model} t={t} />
        </div>
      </div>
      <div className="shrink-0">
        {added ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={busy}
            onClick={onRemove}
            aria-label={t('models.removeModelNamed', {
              name: model.displayName || model.id,
            })}
          >
            <Check className="h-3 w-3" />
            {t('models.added')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={busy}
            onClick={onAdd}
            aria-label={t('models.addModelNamed', {
              name: model.displayName || model.id,
            })}
          >
            <Plus className="h-3 w-3" />
            {t('common.add')}
          </Button>
        )}
      </div>
    </div>
  );
}
