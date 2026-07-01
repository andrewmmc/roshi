import { useEffect } from 'react';
import { PanelLeftOpen, Play, Square } from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useEvalStore } from '@/stores/eval-store';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { ViewToggle } from '@/components/layout/ViewToggle';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  EvalHeadersEditor,
  EvalMessagesEditor,
  EvalParametersEditor,
  EvalSystemPromptEditor,
} from './EvalComposer';
import { RunnerPicker } from './RunnerPicker';
import { JudgeConfig } from './JudgeConfig';
import { ResultsGrid } from './ResultsGrid';
import { CompareDrawer } from './CompareDrawer';

export function EvalView() {
  const loadProviders = useProviderStore((s) => s.load);
  const loaded = useProviderStore((s) => s.loaded);

  const start = useEvalStore((s) => s.start);
  const cancelAll = useEvalStore((s) => s.cancelAll);
  const isRunning = useEvalStore((s) => s.isRunning);
  const isJudging = useEvalStore((s) => s.isJudging);
  const error = useEvalStore((s) => s.error);
  const runners = useEvalStore((s) => s.runners);
  const composer = useEvalStore((s) => s.composer);
  const compareSelection = useEvalStore((s) => s.compareSelection);
  const judgeConfig = useEvalStore((s) => s.judgeConfig);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  useEffect(() => {
    if (!loaded) loadProviders();
  }, [loaded, loadProviders]);

  const handleStart = async () => {
    await start();
  };

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="border-border/70 flex h-11 shrink-0 items-center justify-between gap-3 border-b px-3">
        <div className="flex items-center gap-2">
          {sidebarCollapsed && (
            <IconButton
              variant="ghost"
              size="icon-sm"
              aria-label="Open sidebar"
              className="text-muted-foreground hover:text-foreground shrink-0"
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
          {isRunning ? (
            <Button variant="destructive" size="sm" onClick={cancelAll}>
              <Square className="mr-1.5 h-3.5 w-3.5" />
              Stop all
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={runners.length === 0}
              className="shadow-sm"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
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
            <EvalSetupTabs
              runnerCount={runners.length}
              hasSystemPrompt={composer.systemPrompt.trim().length > 0}
              hasCustomHeaders={composer.customHeaders.some(
                (header) => header.key.trim() !== '',
              )}
              judgeEnabled={judgeConfig.enabled}
            />
          </ErrorBoundary>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="55%" minSize="25%">
          <ErrorBoundary panel>
            <div className="flex h-full flex-col">
              <ResultsGrid />
              {compareSelection.length === 2 && <CompareDrawer />}
            </div>
          </ErrorBoundary>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function EvalSetupTabs({
  runnerCount,
  hasSystemPrompt,
  hasCustomHeaders,
  judgeEnabled,
}: {
  runnerCount: number;
  hasSystemPrompt: boolean;
  hasCustomHeaders: boolean;
  judgeEnabled: boolean;
}) {
  return (
    <Tabs defaultValue="runners" className="flex h-full flex-col gap-0">
      <div className="border-border/70 flex h-11 min-w-0 shrink-0 items-center border-b px-3">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <TabsList
            variant="line"
            className="h-7 w-max max-w-none shrink-0 gap-0"
          >
            <TabsTrigger value="runners" className="px-3 text-xs">
              Runners
              {runnerCount > 0 && (
                <span className="bg-primary text-primary-foreground ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] leading-none">
                  {runnerCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="px-3 text-xs">
              Messages
            </TabsTrigger>
            <TabsTrigger value="system" className="px-3 text-xs">
              System Prompt
              {hasSystemPrompt && (
                <span className="bg-primary ml-1 inline-block h-1.5 w-1.5 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="headers" className="px-3 text-xs">
              Headers
              {hasCustomHeaders && (
                <span className="bg-primary ml-1 inline-block h-1.5 w-1.5 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="parameters" className="px-3 text-xs">
              Parameters
            </TabsTrigger>
            <TabsTrigger value="judge" className="px-3 text-xs">
              Judge
              {judgeEnabled && (
                <span className="bg-primary ml-1 inline-block h-1.5 w-1.5 rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="runners" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <RunnerPicker />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="messages" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <EvalMessagesEditor />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="system" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <EvalSystemPromptEditor />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="headers" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <EvalHeadersEditor />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent
        value="parameters"
        className="min-h-0 flex-1 overflow-hidden"
      >
        <ScrollArea className="h-full">
          <div className="p-4">
            <EvalParametersEditor />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="judge" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <JudgeConfig />
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
