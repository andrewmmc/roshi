import { useMemo } from 'react';
import { GitCompare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useEvalStore } from '@/stores/eval-store';
import { DiffText } from '@/components/ui/diff-text';
import { diffWords, jaccardSimilarity } from '@/utils/diff';

export function CompareView() {
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
            ? 'Select two results to compare.'
            : 'Select one more result to compare.'
        }
        description={
          selectedCount === 0
            ? 'Check "Compare" on two result cards in the Results tab to see a side-by-side diff and metrics.'
            : 'Check "Compare" on another result card in the Results tab.'
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
          <span className="text-muted-foreground">vs</span>{' '}
          <span className="font-mono">{pair.b.runner.label}</span>
          <span className="text-muted-foreground ml-3 text-[11px]">
            Jaccard similarity: {(similarity * 100).toFixed(1)}%
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCompare}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-auto md:grid-cols-2">
        <div className="border-border/60 overflow-auto border-b p-3 md:border-r md:border-b-0">
          <div className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
            Differences
          </div>
          <DiffText segments={diff} />
        </div>
        <div className="overflow-auto p-3">
          <div className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
            Side-by-side metrics
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-normal">Metric</th>
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
                label="Duration"
                a={pair.a.result.metrics.durationMs}
                b={pair.b.result.metrics.durationMs}
                suffix="ms"
              />
              <CompareRow
                label="TTFT"
                a={pair.a.result.metrics.ttftMs}
                b={pair.b.result.metrics.ttftMs}
                suffix="ms"
              />
              <CompareRow
                label="Tokens/s"
                a={pair.a.result.metrics.tokensPerSec}
                b={pair.b.result.metrics.tokensPerSec}
                fractional
              />
              <CompareRow
                label="Prompt tok"
                a={pair.a.result.metrics.promptTokens}
                b={pair.b.result.metrics.promptTokens}
              />
              <CompareRow
                label="Completion tok"
                a={pair.a.result.metrics.completionTokens}
                b={pair.b.result.metrics.completionTokens}
              />
              <CompareRow
                label="Cost USD"
                a={pair.a.result.metrics.costUsd}
                b={pair.b.result.metrics.costUsd}
                fractional
              />
              <CompareRow
                label="Chars"
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
  fractional,
}: {
  label: string;
  a: number | null;
  b: number | null;
  suffix?: string;
  fractional?: boolean;
}) {
  const format = (value: number | null): string => {
    if (value === null || !Number.isFinite(value)) return '—';
    if (fractional) {
      return value.toFixed(label === 'Cost USD' ? 5 : 2);
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
