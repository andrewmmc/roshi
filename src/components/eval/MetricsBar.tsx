import type { EvalMetrics } from '@/types/eval';
import { formatCount } from '@/utils/format';
import { formatCostUsd } from '@/utils/cost';

function formatMs(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms >= 10_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatTps(tps: number | null): string {
  if (tps === null || !Number.isFinite(tps)) return '—';
  if (tps >= 100) return `${tps.toFixed(0)} tok/s`;
  return `${tps.toFixed(1)} tok/s`;
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
  return (
    <div className="flex flex-wrap gap-1.5">
      <MetricChip
        label="Duration"
        value={formatMs(metrics.durationMs)}
        title="Total wall-clock time for the request"
      />
      <MetricChip
        label="TTFT"
        value={formatMs(metrics.ttftMs)}
        title="Time to first streamed token"
      />
      <MetricChip
        label="Throughput"
        value={formatTps(metrics.tokensPerSec)}
        title="Completion tokens per second"
      />
      <MetricChip
        label="Prompt"
        value={
          metrics.promptTokens !== null
            ? formatCount(metrics.promptTokens)
            : '—'
        }
        title="Input tokens"
      />
      <MetricChip
        label="Completion"
        value={
          metrics.completionTokens !== null
            ? formatCount(metrics.completionTokens)
            : '—'
        }
        title="Output tokens"
      />
      <MetricChip
        label="Cost"
        value={formatCostUsd(metrics.costUsd)}
        title="Estimated cost using models.dev pricing"
      />
      <MetricChip
        label="Chars"
        value={
          metrics.responseChars !== null
            ? formatCount(metrics.responseChars)
            : '—'
        }
        title="Length of the response in characters"
      />
      <MetricChip
        label="Finish"
        value={metrics.finishReason ?? '—'}
        title="Provider-reported finish reason"
      />
    </div>
  );
}
