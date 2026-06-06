import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EvalRunResult, EvalRunner, JudgeResult } from '@/types/eval';
import { useEvalStore } from '@/stores/eval-store';
import { MetricsBar } from './MetricsBar';
import { RatingControl } from './RatingControl';

interface ResultCardProps {
  runner: EvalRunner;
  result: EvalRunResult;
  judgeResult: JudgeResult | null;
}

function statusBadgeClass(status: EvalRunResult['status']): string {
  switch (status) {
    case 'success':
      return 'bg-green-500/15 text-green-700 dark:text-green-300';
    case 'streaming':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 animate-pulse';
    case 'pending':
      return 'bg-muted text-muted-foreground';
    case 'cancelled':
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300';
    case 'partial':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
    case 'error':
      return 'bg-destructive/15 text-destructive';
  }
}

export function ResultCard({ runner, result, judgeResult }: ResultCardProps) {
  const removeRunner = useEvalStore((s) => s.removeRunner);
  const compareSelection = useEvalStore((s) => s.compareSelection);
  const toggleCompare = useEvalStore((s) => s.toggleCompare);
  const setRating = useEvalStore((s) => s.setRating);
  const setThumbs = useEvalStore((s) => s.setThumbs);
  const isRunning = useEvalStore((s) => s.isRunning);

  const compareChecked = compareSelection.includes(runner.id);
  const judgeScore = judgeResult?.scores?.[runner.id];
  const isWinner = judgeResult?.winnerRunnerId === runner.id;

  const wordCount = useMemo(
    () => result.content.match(/\S+/g)?.length ?? 0,
    [result.content],
  );

  return (
    <div
      className={cn(
        'border-border/70 bg-card flex h-full min-h-0 min-w-[320px] flex-col rounded-lg border',
        isWinner && 'ring-1 ring-yellow-500/60',
      )}
    >
      <div className="border-border/60 flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
              statusBadgeClass(result.status),
            )}
          >
            {result.status}
          </span>
          <span className="truncate font-mono text-xs" title={runner.label}>
            {runner.label}
          </span>
          {isWinner && (
            <Trophy
              className="h-3.5 w-3.5 text-yellow-500"
              aria-label="Judge winner"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
            <input
              type="checkbox"
              checked={compareChecked}
              onChange={() => toggleCompare(runner.id)}
              className="rounded"
            />
            Compare
          </label>
          <button
            type="button"
            onClick={() => removeRunner(runner.id)}
            disabled={isRunning}
            className="text-muted-foreground hover:text-foreground text-[11px] disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-2">
        {result.error && result.status !== 'partial' ? (
          <pre className="text-destructive text-[12px] whitespace-pre-wrap">
            {result.error}
          </pre>
        ) : result.content ? (
          <>
            {result.status === 'partial' && result.error && (
              <p className="mb-2 text-[12px] font-medium text-amber-700 dark:text-amber-300">
                {result.error}
              </p>
            )}
            <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
              {result.content}
            </pre>
          </>
        ) : (
          <p className="text-muted-foreground text-[12px] italic">
            Waiting for response…
          </p>
        )}
      </div>

      <div className="border-border/60 flex flex-col gap-2 border-t px-3 py-2">
        <MetricsBar metrics={result.metrics} />

        <div className="flex items-center justify-between gap-2">
          <RatingControl
            rating={result.rating}
            thumbs={result.thumbs}
            onRatingChange={(rating) => setRating(runner.id, rating)}
            onThumbsChange={(thumbs) => setThumbs(runner.id, thumbs)}
          />
          <span className="text-muted-foreground text-[10px]">
            {wordCount} words
          </span>
        </div>

        {judgeScore && (
          <div className="border-border/60 border-t pt-1.5">
            <div className="text-muted-foreground/70 mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Judge
            </div>
            <div className="grid grid-cols-4 gap-1 text-[11px]">
              <ScoreCell label="Helpful" value={judgeScore.helpfulness} />
              <ScoreCell label="Accurate" value={judgeScore.accuracy} />
              <ScoreCell label="Clear" value={judgeScore.clarity} />
              <ScoreCell label="Overall" value={judgeScore.overall} bold />
            </div>
            {judgeScore.rationale && (
              <p className="text-muted-foreground mt-1 text-[11px] italic">
                {judgeScore.rationale}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCell({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="border-border/60 bg-muted/30 flex flex-col rounded border px-1.5 py-0.5">
      <span className="text-muted-foreground/70 text-[9px] uppercase">
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-[12px]',
          bold && 'text-foreground font-semibold',
        )}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
}
