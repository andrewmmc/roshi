import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconButton } from '@/components/ui/icon-button';
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
        <div className="border-sidebar-border/60 flex shrink-0 items-center border-b px-3">
          {headerSlot}
        </div>
      )}
      <div className="text-muted-foreground border-sidebar-border/60 flex shrink-0 items-center justify-between border-b px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase">
        <span>Saved eval runs</span>
        <span>{records.length}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {records.length === 0 ? (
          <div className="text-muted-foreground px-3 py-4 text-[12px]">
            No saved eval runs yet. Use “Save run” in the Eval view to keep one
            here.
          </div>
        ) : (
          <ul className="flex flex-col">
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
                <li
                  key={record.id}
                  className="border-sidebar-border/40 hover:bg-sidebar-accent/50 group flex flex-col gap-0.5 border-b px-3 py-2 text-[12px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="text-foreground flex-1 truncate text-left text-[12px] font-medium"
                      onClick={() => {
                        loadRun(record);
                        setMainView('eval');
                      }}
                      title={record.name ?? 'Untitled eval run'}
                    >
                      {record.name ?? 'Untitled eval run'}
                    </button>
                    <IconButton
                      variant="ghost"
                      size="icon-xs"
                      tooltip="Delete eval run"
                      onClick={() => remove(record.id)}
                      aria-label="Delete eval run"
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </IconButton>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                    <span>
                      {record.runners.length} runner
                      {record.runners.length === 1 ? '' : 's'} · {successCount}{' '}
                      ok
                    </span>
                    <span>{formatRelative(record.createdAt)}</span>
                  </div>
                  {winnerLabel && (
                    <div className="text-muted-foreground text-[11px]">
                      Winner: <span className="font-mono">{winnerLabel}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
