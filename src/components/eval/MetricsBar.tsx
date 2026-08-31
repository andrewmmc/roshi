import type { EvalMetrics } from '@/types/eval';
import { useTranslation } from '@/i18n';
import { formatCount } from '@/utils/format';
import { formatCostUsd } from '@/utils/cost';

type Translator = ReturnType<typeof useTranslation>['t'];

function formatMs(ms: number | null, t: Translator): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms >= 10_000) {
    return t('eval.durationSeconds', { value: (ms / 1000).toFixed(1) });
  }
  return t('eval.durationMilliseconds', { value: ms });
}

function formatTps(tps: number | null, t: Translator): string {
  if (tps === null || !Number.isFinite(tps)) return '—';
  const value = tps >= 100 ? tps.toFixed(0) : tps.toFixed(1);
  return t('eval.tokensPerSecond', { value });
}

interface MetricChipProps {
  label: string;
  value: string;
  title?: string;
}

function MetricChip({ label, value, title }: MetricChipProps) {
  return (
    <div
      className="border-border/60 bg-muted/30 flex flex-col items-start rounded border px-2 py-1"
      title={title}
    >
      <span className="text-muted-foreground/70 text-[9px] font-semibold tracking-wider uppercase">
        {label}
      </span>
      <span className="text-foreground font-mono text-[11px]">{value}</span>
    </div>
  );
}

interface MetricsBarProps {
  metrics: EvalMetrics;
}

export function MetricsBar({ metrics }: MetricsBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      <MetricChip
        label={t('eval.metricDuration')}
        value={formatMs(metrics.durationMs, t)}
        title={t('eval.titleDuration')}
      />
      <MetricChip
        label={t('eval.metricTtft')}
        value={formatMs(metrics.ttftMs, t)}
        title={t('eval.titleTtft')}
      />
      <MetricChip
        label={t('eval.metricThroughput')}
        value={formatTps(metrics.tokensPerSec, t)}
        title={t('eval.titleThroughput')}
      />
      <MetricChip
        label={t('eval.metricPrompt')}
        value={
          metrics.promptTokens !== null
            ? formatCount(metrics.promptTokens)
            : '—'
        }
        title={t('eval.titlePromptTokens')}
      />
      <MetricChip
        label={t('eval.metricCompletion')}
        value={
          metrics.completionTokens !== null
            ? formatCount(metrics.completionTokens)
            : '—'
        }
        title={t('eval.titleCompletionTokens')}
      />
      <MetricChip
        label={t('eval.metricCost')}
        value={formatCostUsd(metrics.costUsd)}
        title={t('eval.titleCost')}
      />
      <MetricChip
        label={t('eval.metricChars')}
        value={
          metrics.responseChars !== null
            ? formatCount(metrics.responseChars)
            : '—'
        }
        title={t('eval.titleChars')}
      />
      <MetricChip
        label={t('eval.metricFinish')}
        value={metrics.finishReason ?? '—'}
        title={t('eval.titleFinish')}
      />
    </div>
  );
}
