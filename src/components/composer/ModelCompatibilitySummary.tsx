import { useSelectedModelCapabilities } from '@/stores/provider-store';
import { buildModelCompatibilitySummary } from '@/utils/model-compatibility-summary';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

export function ModelCompatibilitySummary() {
  const { t } = useTranslation();
  const capabilities = useSelectedModelCapabilities();
  const items = buildModelCompatibilitySummary(capabilities);

  return (
    <div className="border-border/50 bg-muted/30 rounded-lg border p-2.5">
      <p className="text-muted-foreground/70 mb-2 text-[11px] font-medium tracking-wide uppercase">
        {t('request.modelCompatibility')}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.labelKey} className="min-w-0">
            <dt className="text-muted-foreground/60 text-xs">
              {t(item.labelKey)}
            </dt>
            <dd
              className={cn(
                'truncate text-xs font-medium',
                item.supported === false
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-foreground/90',
              )}
            >
              {item.valueKey ? t(item.valueKey) : item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
