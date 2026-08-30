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
import { AppBanner } from './AppBanner';
import { useTranslation } from '@/i18n';

const COLLAPSE_BREAKPOINT = 768;

export function AppLayout() {
  const { t } = useTranslation();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
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

  // A collapsed panel remains mounted so its layout can be restored. Remove
  // its controls from the focus/accessibility trees and return focus to the
  // visible open-sidebar control when collapse was triggered from within it.
  useEffect(() => {
    if (!sidebarCollapsed) return;
    if (asideRef.current?.contains(document.activeElement)) {
      document.querySelector<HTMLButtonElement>('[data-open-sidebar]')?.focus();
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
    <div className="bg-sidebar flex h-screen w-screen flex-col overflow-hidden">
      <a
        href="#main-content"
        className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:p-2 focus:shadow-md"
      >
        {t('skipToMainContent')}
      </a>
      <AppBanner />
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-0 flex-1"
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
          <aside
            ref={asideRef}
            className="h-full"
            aria-hidden={sidebarCollapsed || undefined}
            inert={sidebarCollapsed || undefined}
          >
            <ErrorBoundary panel>
              <Sidebar />
            </ErrorBoundary>
          </aside>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="main" minSize="480px">
          <main id="main-content" className="h-full">
            <MainPanel />
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
