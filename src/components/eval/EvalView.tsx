import { useEffect, useState } from 'react';
import {
  Download,
  FileDown,
  MoreHorizontal,
  PanelLeftOpen,
  Play,
  Save,
  Square,
  Upload,
} from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEvalStore } from '@/stores/eval-store';
import { useEvalRunsStore } from '@/stores/eval-runs-store';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { ViewToggle } from '@/components/layout/ViewToggle';
import { toast } from '@/stores/toast-store';
import { exportEvalRunJson, exportEvalRunCsv } from '@/utils/export';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useContainerBreakpoint } from '@/hooks/use-container-breakpoint';
import { EvalComposer } from './EvalComposer';
import { RunnerPicker } from './RunnerPicker';
import { JudgeConfig } from './JudgeConfig';
import { ResultsGrid } from './ResultsGrid';
import { CompareDrawer } from './CompareDrawer';

export function EvalView() {
  const loadProviders = useProviderStore((s) => s.load);
  const loaded = useProviderStore((s) => s.loaded);

  const start = useEvalStore((s) => s.start);
  const cancelAll = useEvalStore((s) => s.cancelAll);
  const buildRecord = useEvalStore((s) => s.buildRecord);
  const isRunning = useEvalStore((s) => s.isRunning);
  const isJudging = useEvalStore((s) => s.isJudging);
  const error = useEvalStore((s) => s.error);
  const runners = useEvalStore((s) => s.runners);
  const compareSelection = useEvalStore((s) => s.compareSelection);
  const judgeResult = useEvalStore((s) => s.judgeResult);
  const loadIntoComposer = useEvalStore((s) => s.loadIntoComposer);
  const setMainView = useUiStore((s) => s.setMainView);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  const saveRecord = useEvalRunsStore((s) => s.save);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const { containerRef, narrow } = useContainerBreakpoint(580);

  useEffect(() => {
    if (!loaded) loadProviders();
  }, [loaded, loadProviders]);

  const handleStart = async () => {
    await start();
  };

  const handleSave = async () => {
    const record = buildRecord(saveName.trim() || undefined);
    await saveRecord(record);
    setSaveOpen(false);
    setSaveName('');
    toast('Saved eval run');
  };

  const handleExportJson = () => {
    exportEvalRunJson(buildRecord());
  };

  const handleExportCsv = () => {
    exportEvalRunCsv(buildRecord());
  };

  const handleLoadIntoComposer = (runnerId?: string | null) => {
    loadIntoComposer(runnerId);
    setMainView('request');
    toast('Loaded eval case into composer');
  };

  const secondaryDisabled = isRunning || runners.length === 0;

  return (
    <div className="bg-background flex h-full flex-col">
      <div
        ref={containerRef}
        className="border-border/70 flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4"
      >
        <div className="flex items-center gap-2">
          {sidebarCollapsed && (
            <IconButton
              variant="ghost"
              size="icon"
              aria-label="Open sidebar"
              className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0"
              onClick={() => setSidebarCollapsed(false)}
              tooltip="Open sidebar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </IconButton>
          )}
          <ViewToggle />
          <span className="text-muted-foreground hidden text-xs md:inline">
            Run one prompt against multiple model providers
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isJudging && (
            <span className="text-muted-foreground animate-pulse text-xs">
              Judging…
            </span>
          )}
          {/* Secondary actions — inline when wide, overflow when narrow */}
          {!narrow ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleLoadIntoComposer()}
                title="Load this eval prompt into the main composer"
              >
                <Upload className="mr-1.5 h-3 w-3" />
                Load into composer
              </Button>
              {judgeResult?.winnerRunnerId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    handleLoadIntoComposer(judgeResult.winnerRunnerId)
                  }
                  title="Load the judge winner into the main composer"
                >
                  Load winner
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={secondaryDisabled}
                onClick={() => setSaveOpen(true)}
              >
                <Save className="mr-1.5 h-3 w-3" />
                Save run
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={secondaryDisabled}
                onClick={handleExportJson}
                title="Export run as JSON"
              >
                <FileDown className="mr-1.5 h-3 w-3" />
                JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={secondaryDisabled}
                onClick={handleExportCsv}
                title="Export metrics as CSV"
              >
                <Download className="mr-1.5 h-3 w-3" />
                CSV
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleLoadIntoComposer()}>
                  <Upload className="h-3.5 w-3.5" />
                  Load into composer
                </DropdownMenuItem>
                {judgeResult?.winnerRunnerId && (
                  <DropdownMenuItem
                    onClick={() =>
                      handleLoadIntoComposer(judgeResult.winnerRunnerId)
                    }
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Load winner
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={secondaryDisabled}
                  onClick={() => setSaveOpen(true)}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save run
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={secondaryDisabled}
                  onClick={handleExportJson}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={secondaryDisabled}
                  onClick={handleExportCsv}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isRunning ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={cancelAll}
              className="h-7 text-xs"
            >
              <Square className="mr-1.5 h-3 w-3" />
              Stop all
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={runners.length === 0}
              className="h-7 text-xs shadow-sm"
            >
              <Play className="mr-1.5 h-3 w-3" />
              Run eval
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border-destructive/40 border-b px-4 py-1.5 text-xs">
          {error}
        </div>
      )}

      <ResizablePanelGroup orientation="vertical" className="flex-1">
        <ResizablePanel defaultSize="45%" minSize="22%">
          <ErrorBoundary panel>
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 px-4 py-4">
                <RunnerPicker />
                <div className="border-border/60 border-t pt-3">
                  <EvalComposer />
                </div>
                <div className="border-border/60 border-t pt-3">
                  <JudgeConfig />
                </div>
              </div>
            </ScrollArea>
          </ErrorBoundary>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="55%" minSize="25%">
          <ErrorBoundary panel>
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <ResultsGrid />
              </div>
              {compareSelection.length === 2 && <CompareDrawer />}
            </div>
          </ErrorBoundary>
        </ResizablePanel>
      </ResizablePanelGroup>

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
