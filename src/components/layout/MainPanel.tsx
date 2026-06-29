import { lazy, Suspense, useState } from 'react';
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
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { useEvalStore } from '@/stores/eval-store';
import { IS_MAC } from '@/lib/platform';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TokenCountBadge } from '@/components/composer/TokenCountBadge';
import { toast } from '@/stores/toast-store';
import { ViewToggle } from './ViewToggle';
import { TabBar } from './TabBar';
import { useContainerBreakpoint } from '@/hooks/use-container-breakpoint';

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
  const hasProvider = useProviderStore((s) => s.providers.length > 0);
  const setMainView = useUiStore((s) => s.setMainView);
  const seedFromMainComposer = useEvalStore((s) => s.seedFromMainComposer);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  const [envPreviewOpen, setEnvPreviewOpen] = useState(false);
  const { containerRef, narrow } = useContainerBreakpoint(520);
  const mainLayout = useDefaultLayout({ id: 'roshi-main' });

  const handleComparePrompt = () => {
    seedFromMainComposer();
    setMainView('eval');
    toast('Prompt copied to eval. Add models, then run compare.');
  };

  return (
    <>
      <TabBar />
      <div
        ref={containerRef}
        className="border-border/70 flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4"
      >
        <div className="flex min-w-0 items-center gap-2">
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
          <ProviderSelect />
          <EnvironmentSelector />
          {/* Always render so the sheet portal stays mounted; hide trigger when narrow */}
          <span className={narrow ? 'hidden' : undefined}>
            <EnvironmentPreviewButton
              open={envPreviewOpen}
              onOpenChange={setEnvPreviewOpen}
            />
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={cancel}
            >
              <Square className="mr-1.5 h-3 w-3" />
              Stop
              <kbd className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-current/25 bg-current/10 px-1 font-sans text-[9px] leading-none font-medium tracking-wide opacity-60">
                Esc
              </kbd>
            </Button>
          ) : (
            <div className="flex items-center">
              <Button
                size="sm"
                className="h-7 rounded-r-none text-xs shadow-sm"
                onClick={send}
                disabled={!hasProvider}
              >
                <Send className="mr-1.5 h-3 w-3" />
                Send
                <span className="ml-1.5 hidden items-center gap-0.5 opacity-60 sm:inline-flex">
                  {(IS_MAC ? ['⌘', '↵'] : ['Ctrl', '↵']).map((k, i) => (
                    <kbd
                      key={i}
                      className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-current/25 bg-current/10 px-1 font-sans text-[9px] leading-none font-medium tracking-wide"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-ring/50 border-primary-foreground/20 inline-flex h-7 w-7 items-center justify-center rounded-l-none rounded-r-lg border-l shadow-sm transition-all outline-none focus-visible:ring-3"
                  aria-label="More send actions"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <DropdownMenuItem onClick={handleComparePrompt}>
                    <GitCompare className="h-3.5 w-3.5" />
                    Compare prompt across models
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
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
