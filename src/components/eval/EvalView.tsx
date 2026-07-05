import { useEffect, useState } from 'react';
import {
  Download,
  Eye,
  FileDown,
  MoreHorizontal,
  PanelLeftOpen,
  Play,
  Square,
} from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Kbd } from '@/components/ui/kbd';
import { PanelHeader } from '@/components/ui/panel-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EnvironmentSelector } from '@/components/environments/EnvironmentManager';
import { EnvironmentPreviewButton } from '@/components/environments/EnvironmentPreviewSheet';
import { useEvalStore } from '@/stores/eval-store';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { IS_MAC } from '@/lib/platform';
import { ViewToggle } from '@/components/layout/ViewToggle';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useContainerBreakpoint } from '@/hooks/use-container-breakpoint';
import { exportEvalRunJson, exportEvalRunCsv } from '@/utils/export';
import {
  EvalHeadersEditor,
  EvalMessagesEditor,
  EvalParametersEditor,
  EvalSystemPromptEditor,
} from './EvalComposer';
import { RunnerPicker } from './RunnerPicker';
import { JudgeConfig } from './JudgeConfig';
import { ResultsGrid } from './ResultsGrid';
import { CompareView } from './CompareView';

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
  const judgeConfig = useEvalStore((s) => s.judgeConfig);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  const [envPreviewOpen, setEnvPreviewOpen] = useState(false);
  const { containerRef, narrow } = useContainerBreakpoint(640);

  useEffect(() => {
    if (!loaded) loadProviders();
  }, [loaded, loadProviders]);

  const handleStart = async () => {
    await start();
  };

  return (
    <div className="bg-background flex h-full min-w-0 flex-col overflow-hidden">
      <PanelHeader ref={containerRef} className="justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
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
          <EnvironmentSelector />
          {/* Always render so the sheet portal stays mounted; hide trigger when narrow */}
          <span className={narrow ? 'hidden' : undefined}>
            <EnvironmentPreviewButton
              open={envPreviewOpen}
              onOpenChange={setEnvPreviewOpen}
              messages={composer.messages}
              systemPrompt={composer.systemPrompt}
              customHeaders={composer.customHeaders}
            />
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isJudging && (
            <span className="text-muted-foreground animate-pulse text-xs">
              Judging…
            </span>
          )}
          {narrow && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEnvPreviewOpen(true)}>
                  <Eye className="h-3.5 w-3.5" />
                  Env preview
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isRunning ? (
            <Button variant="destructive" size="sm" onClick={cancelAll}>
              <Square className="mr-1.5 h-3.5 w-3.5" />
              Stop all
              <Kbd className="ml-1.5">Esc</Kbd>
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
              <span className="ml-1.5 hidden items-center gap-0.5 sm:inline-flex">
                {(IS_MAC ? ['⌘', '↵'] : ['Ctrl', '↵']).map((k, i) => (
                  <Kbd key={i}>{k}</Kbd>
                ))}
              </span>
            </Button>
          )}
        </div>
      </PanelHeader>

      {error && (
        <div
          role="alert"
          className="bg-destructive/10 text-destructive border-destructive/40 border-b px-4 py-1.5 text-xs"
        >
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
            <EvalResultsPanel />
          </ErrorBoundary>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function EvalResultsPanel() {
  const runners = useEvalStore((s) => s.runners);
  const compareSelection = useEvalStore((s) => s.compareSelection);
  const isRunning = useEvalStore((s) => s.isRunning);
  const buildRecord = useEvalStore((s) => s.buildRecord);

  const exportDisabled = isRunning || runners.length === 0;

  const handleExportJson = () => {
    exportEvalRunJson(buildRecord());
  };

  const handleExportCsv = () => {
    exportEvalRunCsv(buildRecord());
  };

  return (
    <Tabs defaultValue="results" className="flex h-full min-w-0 flex-col gap-0">
      <PanelHeader className="justify-between">
        <TabsList variant="line" className="h-7 gap-0">
          <TabsTrigger value="results" className="px-3 text-xs">
            Results
          </TabsTrigger>
          <TabsTrigger value="compare" className="px-3 text-xs">
            Compare
            {compareSelection.length > 0 && (
              <span className="bg-primary text-primary-foreground ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] leading-none">
                {compareSelection.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-1">
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            tooltip="Export run as JSON"
            onClick={handleExportJson}
            disabled={exportDisabled}
          >
            <FileDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            tooltip="Export metrics as CSV"
            onClick={handleExportCsv}
            disabled={exportDisabled}
          >
            <Download className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </PanelHeader>

      <TabsContent
        value="results"
        className="mt-0 min-h-0 flex-1 overflow-hidden"
      >
        <ResultsGrid />
      </TabsContent>

      <TabsContent
        value="compare"
        className="mt-0 min-h-0 flex-1 overflow-hidden"
      >
        <CompareView />
      </TabsContent>
    </Tabs>
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
      <PanelHeader className="min-w-0">
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
      </PanelHeader>

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
