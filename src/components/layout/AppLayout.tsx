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
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="24%" minSize="18%" maxSize="32%">
          <ErrorBoundary panel>
            <Sidebar />
          </ErrorBoundary>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="76%" minSize="40%">
          <MainPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
