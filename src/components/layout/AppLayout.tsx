import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Sidebar } from './Sidebar';
import { MainPanel } from './MainPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function AppLayout() {
  return (
    <div className="bg-sidebar h-screen w-screen overflow-hidden">
      <a
        href="#main-content"
        className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:p-2 focus:shadow-md"
      >
        Skip to main content
      </a>
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="24%" minSize="18%" maxSize="32%">
          <aside className="h-full">
            <ErrorBoundary panel>
              <Sidebar />
            </ErrorBoundary>
          </aside>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="76%" minSize="40%">
          <main id="main-content" className="h-full">
            <MainPanel />
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
