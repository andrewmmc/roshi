import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Sidebar } from './Sidebar';
import { MainPanel } from './MainPanel';

export function AppLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-sidebar">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="24%" minSize="18%" maxSize="32%">
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="76%" minSize="40%">
          <MainPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
