import { useTranslation } from '@/i18n';

export function StreamingIndicator() {
  const { t } = useTranslation();
  return (
    <span
      className="text-muted-foreground inline-flex items-center gap-1"
      aria-label={t('response.streamingAria')}
    >
      <span className="flex gap-0.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms] motion-reduce:animate-none" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms] motion-reduce:animate-none" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms] motion-reduce:animate-none" />
      </span>
      <span className="sr-only">{t('response.streamingAria')}</span>
    </span>
  );
}
