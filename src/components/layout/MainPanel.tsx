import { lazy, Suspense, useId, useState } from 'react';
import { useDefaultLayout } from 'react-resizable-panels';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { RequestComposer } from '@/components/composer/RequestComposer';
import { ResponsePanel } from '@/components/response/ResponsePanel';
import { ProviderSelect } from '@/components/composer/ProviderSelect';
import { EnvironmentSelector } from '@/components/environments/EnvironmentManager';
import { EnvironmentPreviewButton } from '@/components/environments/EnvironmentPreviewSheet';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { PanelHeader } from '@/components/ui/panel-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  Eye,
  GitCompare,
  MoreHorizontal,
  PanelLeftOpen,
  Send,
  Square,
} from 'lucide-react';
import { useResponseStore } from '@/stores/response-store';
import { useSendRequest } from '@/hooks/use-send-request';
import { useSelectedModel, useSelectedProvider } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { useEvalStore } from '@/stores/eval-store';
import { IS_MAC } from '@/lib/platform';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TokenCountBadge } from '@/components/composer/TokenCountBadge';
import { Kbd } from '@/components/ui/kbd';
import { toast } from '@/stores/toast-store';
import { ViewToggle } from './ViewToggle';
import { TabBar } from './TabBar';
import { useContainerBreakpoint } from '@/hooks/use-container-breakpoint';
import { DraftStatus } from './DraftStatus';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const EvalView = lazy(() =>
  import('@/components/eval/EvalView').then((m) => ({ default: m.EvalView })),
);

export function MainPanel() {
  const mainView = useUiStore((s) => s.mainView);

  return (
    <div className="bg-background flex h-full flex-col">
      {mainView === 'request' ? <RequestView /> : null}
      {mainView === 'eval' ? (
        <Suspense
          fallback={
            <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
              Loading eval…
            </div>
          }
        >
          <EvalView />
        </Suspense>
      ) : null}
    </div>
  );
}

function RequestView() {
  const isLoading = useResponseStore((s) => s.isLoading);
  const { send, cancel } = useSendRequest();
  const provider = useSelectedProvider();
  const model = useSelectedModel();
  const canSend = Boolean(provider && model && provider.apiKey.trim());
  const sendDisabledReason = !provider
    ? 'Select a provider'
    : !model
      ? 'Select a model'
      : !provider.apiKey.trim()
        ? 'Add an API key in provider settings'
        : undefined;
  const setMainView = useUiStore((s) => s.setMainView);
  const seedFromMainComposer = useEvalStore((s) => s.seedFromMainComposer);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  const [envPreviewOpen, setEnvPreviewOpen] = useState(false);
  const { containerRef, narrow } = useContainerBreakpoint(640);
  const mainLayout = useDefaultLayout({ id: 'roshi-main' });
  const sendHintId = useId();

  const handleComparePrompt = () => {
    seedFromMainComposer();
    setMainView('eval');
    toast('Prompt copied to eval. Add models, then run compare.');
  };

  const sendButton = (
    <Button
      size="sm"
      className="rounded-r-none shadow-sm"
      onClick={send}
      disabled={!canSend}
      aria-describedby={!canSend ? sendHintId : undefined}
    >
      <Send className="mr-1.5 h-3.5 w-3.5" />
      Send
      <span className="ml-1.5 hidden items-center gap-0.5 sm:inline-flex">
        {(IS_MAC ? ['⌘', '↵'] : ['Ctrl', '↵']).map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </span>
    </Button>
  );

  const renderRequestActions = () => (
    <div className="flex shrink-0 items-center gap-2">
      <DraftStatus />
      <TokenCountBadge />
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
      {isLoading ? (
        <Button variant="destructive" size="sm" onClick={cancel}>
          <Square className="mr-1.5 h-3.5 w-3.5" />
          Stop
          <Kbd className="ml-1.5">Esc</Kbd>
        </Button>
      ) : (
        <div className="flex items-center">
          {sendDisabledReason ? (
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="inline-flex"
                      tabIndex={0}
                      aria-describedby={sendHintId}
                    />
                  }
                >
                  {sendButton}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {sendDisabledReason}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            sendButton
          )}
          <span id={sendHintId} className="sr-only">
            {sendDisabledReason}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-ring/50 border-primary-foreground/20 inline-flex h-7 w-7 items-center justify-center rounded-l-none rounded-r-lg border-l shadow-sm transition-all outline-none focus-visible:ring-3"
              aria-label="More send actions"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-64">
              <DropdownMenuItem
                className="text-xs"
                onClick={handleComparePrompt}
              >
                <GitCompare className="h-3.5 w-3.5" />
                Compare prompt across models
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );

  return (
    <>
      <TabBar />
      <PanelHeader
        ref={containerRef}
        className={cn(
          'justify-between gap-3',
          narrow && 'h-auto min-h-11 flex-wrap gap-2 py-2',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center gap-2',
            narrow ? 'w-full justify-between' : 'flex-1',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {sidebarCollapsed && (
              <IconButton
                variant="ghost"
                size="icon-sm"
                aria-label="Open sidebar"
                data-open-sidebar
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setSidebarCollapsed(false)}
                tooltip="Open sidebar"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </IconButton>
            )}
            <ViewToggle />
            {!narrow && (
              <>
                <ProviderSelect />
                <EnvironmentSelector />
                <EnvironmentPreviewButton
                  open={envPreviewOpen}
                  onOpenChange={setEnvPreviewOpen}
                />
              </>
            )}
          </div>
          {narrow && renderRequestActions()}
        </div>
        {narrow ? (
          <div className="flex w-full min-w-0 items-center gap-2">
            <ProviderSelect className="basis-auto" />
            <EnvironmentSelector />
          </div>
        ) : (
          renderRequestActions()
        )}
      </PanelHeader>
      <ResizablePanelGroup
        orientation="vertical"
        className="flex-1"
        defaultLayout={mainLayout.defaultLayout}
        onLayoutChanged={mainLayout.onLayoutChanged}
      >
        <ResizablePanel id="composer" defaultSize="40%" minSize="20%">
          <ErrorBoundary panel>
            <RequestComposer />
          </ErrorBoundary>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="response" defaultSize="60%" minSize="20%">
          <ErrorBoundary panel>
            <ResponsePanel />
          </ErrorBoundary>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
