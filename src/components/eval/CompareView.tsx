import { useMemo } from 'react';
import { GitCompare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslation } from '@/i18n';
import { useEvalStore } from '@/stores/eval-store';
import { DiffText } from '@/components/ui/diff-text';
import { diffWords, jaccardSimilarity } from '@/utils/diff';

export function CompareView() {
  const { t } = useTranslation();
  const compareSelection = useEvalStore((s) => s.compareSelection);
  const runners = useEvalStore((s) => s.runners);
  const results = useEvalStore((s) => s.results);
  const clearCompare = useEvalStore((s) => s.clearCompare);

  const pair = useMemo(() => {
    if (compareSelection.length !== 2) return null;
    const [aId, bId] = compareSelection;
    const aRunner = runners.find((r) => r.id === aId);
    const bRunner = runners.find((r) => r.id === bId);
    if (!aRunner || !bRunner) return null;
    return {
      a: { runner: aRunner, result: results[aId] },
      b: { runner: bRunner, result: results[bId] },
    };
  }, [compareSelection, runners, results]);

  if (!pair || !pair.a.result || !pair.b.result) {
    const selectedCount = Math.min(compareSelection.length, 2);
    return (
      <EmptyState
        icon={GitCompare}
        title={
          selectedCount === 0
            ? t('eval.selectTwoResults')
            : t('eval.selectOneMoreResult')
        }
        description={
          selectedCount === 0
            ? t('eval.compareHint')
            : t('eval.compareHintMore')
        }
      />
    );
  }

  const diff = diffWords(pair.a.result.content, pair.b.result.content);
  const similarity = jaccardSimilarity(
    pair.a.result.content,
    pair.b.result.content,
  );

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="border-border/60 flex items-center justify-between gap-2 border-b px-3 py-1.5">
        <div className="text-foreground min-w-0 truncate text-xs font-medium">
          <span className="font-mono">{pair.a.runner.label}</span>{' '}
          <span className="text-muted-foreground">{t('eval.vs')}</span>{' '}
          <span className="font-mono">{pair.b.runner.label}</span>
          <span className="text-muted-foreground ml-3 text-[11px]">
            {t('eval.jaccardSimilarity', {
              value: `${(similarity * 100).toFixed(1)}%`,
            })}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCompare}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="mr-1 h-3 w-3" />
          {t('eval.clear')}
        </Button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-auto md:grid-cols-2">
        <div className="border-border/60 overflow-auto border-b p-3 md:border-r md:border-b-0">
          <div className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
            {t('eval.differences')}
          </div>
          <DiffText segments={diff} />
        </div>
        <div className="overflow-auto p-3">
          <div className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
            {t('eval.sideBySideMetrics')}
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-normal">{t('eval.metric')}</th>
                <th className="text-right font-normal">
                  {pair.a.runner.label}
                </th>
                <th className="text-right font-normal">
                  {pair.b.runner.label}
                </th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <CompareRow
                label={t('eval.metricDuration')}
                a={pair.a.result.metrics.durationMs}
                b={pair.b.result.metrics.durationMs}
                suffix="ms"
              />
              <CompareRow
                label={t('eval.metricTtft')}
                a={pair.a.result.metrics.ttftMs}
                b={pair.b.result.metrics.ttftMs}
                suffix="ms"
              />
              <CompareRow
                label={t('eval.metricTokensPerSec')}
                a={pair.a.result.metrics.tokensPerSec}
                b={pair.b.result.metrics.tokensPerSec}
                decimals={2}
              />
              <CompareRow
                label={t('eval.metricPromptTokens')}
                a={pair.a.result.metrics.promptTokens}
                b={pair.b.result.metrics.promptTokens}
              />
              <CompareRow
                label={t('eval.metricCompletionTokens')}
                a={pair.a.result.metrics.completionTokens}
                b={pair.b.result.metrics.completionTokens}
              />
              <CompareRow
                label={t('eval.metricCostUsd')}
                a={pair.a.result.metrics.costUsd}
                b={pair.b.result.metrics.costUsd}
                decimals={5}
              />
              <CompareRow
                label={t('eval.metricChars')}
                a={pair.a.result.metrics.responseChars}
                b={pair.b.result.metrics.responseChars}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  a,
  b,
  suffix,
  decimals,
}: {
  label: string;
  a: number | null;
  b: number | null;
  suffix?: string;
  decimals?: number;
}) {
  const format = (value: number | null): string => {
    if (value === null || !Number.isFinite(value)) return '—';
    if (decimals !== undefined) {
      return value.toFixed(decimals);
    }
    return Math.round(value).toString();
  };
  const aLabel = `${format(a)}${suffix && a !== null ? suffix : ''}`;
  const bLabel = `${format(b)}${suffix && b !== null ? suffix : ''}`;
  return (
    <tr className="border-border/40 border-t">
      <td className="py-0.5 pr-2">{label}</td>
      <td className="py-0.5 text-right">{aLabel}</td>
      <td className="py-0.5 text-right">{bLabel}</td>
    </tr>
  );
}
