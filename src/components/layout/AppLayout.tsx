import { useEffect, useRef } from 'react';
import {
  useDefaultLayout,
  type PanelImperativeHandle,
} from 'react-resizable-panels';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Sidebar } from './Sidebar';
import { MainPanel } from './MainPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useUiStore } from '@/stores/ui-store';

const COLLAPSE_BREAKPOINT = 768;

export function AppLayout() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'roshi-shell',
  });

  // Sync Zustand state → panel imperative API (2.1)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (sidebarCollapsed && !panel.isCollapsed()) {
      panel.collapse();
    } else if (!sidebarCollapsed && panel.isCollapsed()) {
      panel.expand();
    }
  }, [sidebarCollapsed]);

  // Auto-collapse on narrow viewport (2.2)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COLLAPSE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setSidebarCollapsed(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setSidebarCollapsed]);

  return (
    <div className="bg-sidebar h-screen w-screen overflow-hidden">
      <a
        href="#main-content"
        className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:p-2 focus:shadow-md"
      >
        Skip to main content
      </a>
      <ResizablePanelGroup
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
      >
        <ResizablePanel
          id="sidebar"
          panelRef={panelRef}
          defaultSize="300px"
          minSize="240px"
          maxSize="420px"
          collapsible
          collapsedSize={0}
          onResize={() => {
            const panel = panelRef.current;
            if (panel) setSidebarCollapsed(panel.isCollapsed());
          }}
        >
          <aside className="h-full">
            <ErrorBoundary panel>
              <Sidebar />
            </ErrorBoundary>
          </aside>
        </ResizablePanel>
        {!sidebarCollapsed && <ResizableHandle />}
        <ResizablePanel id="main" minSize="480px">
          <main id="main-content" className="h-full">
            <MainPanel />
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
