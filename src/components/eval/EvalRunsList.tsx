import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BarChart2, Save, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconButton } from '@/components/ui/icon-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarRow } from '@/components/ui/sidebar-row';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEvalRunsStore } from '@/stores/eval-runs-store';
import { useEvalStore } from '@/stores/eval-store';
import { useUiStore } from '@/stores/ui-store';
import { toast } from '@/stores/toast-store';
import { formatRelativeTime } from '@/utils/relative-time';

interface EvalRunsListProps {
  headerSlot?: ReactNode;
}

export function EvalRunsList({ headerSlot }: EvalRunsListProps) {
  const records = useEvalRunsStore((s) => s.records);
  const loaded = useEvalRunsStore((s) => s.loaded);
  const load = useEvalRunsStore((s) => s.load);
  const remove = useEvalRunsStore((s) => s.remove);
  const loadRun = useEvalStore((s) => s.loadRun);
  const buildRecord = useEvalStore((s) => s.buildRecord);
  const runners = useEvalStore((s) => s.runners);
  const isRunning = useEvalStore((s) => s.isRunning);
  const saveRecord = useEvalRunsStore((s) => s.save);
  const setMainView = useUiStore((s) => s.setMainView);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const handleSave = async () => {
    const record = buildRecord(saveName.trim() || undefined);
    await saveRecord(record);
    setSaveOpen(false);
    setSaveName('');
    toast('Saved eval run');
  };

  const saveDisabled = isRunning || runners.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-sidebar-border flex h-11 shrink-0 items-center justify-between border-b px-3">
        {headerSlot ?? (
          <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            Collections
          </span>
        )}
        <div className="flex items-center">
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSaveOpen(true)}
            tooltip="Save current eval run"
            disabled={saveDisabled}
          >
            <Save className="h-3.5 w-3.5" />
          </IconButton>
        </div>
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
                      <span>{formatRelativeTime(record.createdAt)}</span>
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

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save eval run</DialogTitle>
            <DialogDescription>
              The current prompt, runners, and results will be persisted
              locally.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Optional name (e.g. 'Pricing wording variants')"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
