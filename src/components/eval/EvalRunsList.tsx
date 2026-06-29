import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BarChart2, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconButton } from '@/components/ui/icon-button';
import { SidebarRow } from '@/components/ui/sidebar-row';
import { EmptyState } from '@/components/ui/empty-state';
import { useEvalRunsStore } from '@/stores/eval-runs-store';
import { useEvalStore } from '@/stores/eval-store';
import { useUiStore } from '@/stores/ui-store';

interface EvalRunsListProps {
  headerSlot?: ReactNode;
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}h ago`;
  const day = Math.floor(hour / 24);
  return `${day}d ago`;
}

export function EvalRunsList({ headerSlot }: EvalRunsListProps) {
  const records = useEvalRunsStore((s) => s.records);
  const loaded = useEvalRunsStore((s) => s.loaded);
  const load = useEvalRunsStore((s) => s.load);
  const remove = useEvalRunsStore((s) => s.remove);
  const loadRun = useEvalStore((s) => s.loadRun);
  const setMainView = useUiStore((s) => s.setMainView);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {headerSlot && (
        <div className="border-sidebar-border flex h-11 shrink-0 items-center border-b px-3">
          {headerSlot}
        </div>
      )}
      <div className="text-muted-foreground border-sidebar-border flex shrink-0 items-center justify-between border-b px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase">
        <span>Saved eval runs</span>
        <span>{records.length}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {records.length === 0 ? (
          <EmptyState
            compact
            icon={BarChart2}
            title="No saved runs"
            description="Compare one prompt across multiple models, then save the run here."
          />
        ) : (
          <div className="flex flex-col gap-px p-1">
            {records.map((record) => {
              const successCount = record.results.filter(
                (r) => r.status === 'success',
              ).length;
              const winnerLabel = record.judgeResult?.winnerRunnerId
                ? (record.runners.find(
                    (r) => r.id === record.judgeResult?.winnerRunnerId,
                  )?.label ?? null)
                : null;
              return (
                <SidebarRow
                  key={record.id}
                  title={record.name ?? 'Untitled eval run'}
                  onClick={() => {
                    loadRun(record);
                    setMainView('eval');
                  }}
                  actions={
                    <IconButton
                      variant="ghost"
                      size="icon-xs"
                      tooltip="Delete eval run"
                      onClick={() => remove(record.id)}
                      aria-label="Delete eval run"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </IconButton>
                  }
                >
                  <div className="min-w-0 flex-1 pr-8">
                    <div className="text-foreground/85 truncate text-[13px] leading-snug font-medium">
                      {record.name ?? 'Untitled eval run'}
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                      <span>
                        {record.runners.length} runner
                        {record.runners.length === 1 ? '' : 's'} ·{' '}
                        {successCount} ok
                      </span>
                      <span>{formatRelative(record.createdAt)}</span>
                    </div>
                    {winnerLabel && (
                      <div className="text-muted-foreground text-[11px]">
                        Winner: <span className="font-mono">{winnerLabel}</span>
                      </div>
                    )}
                  </div>
                </SidebarRow>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
