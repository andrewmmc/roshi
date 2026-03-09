import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Sidebar } from './Sidebar';
import { MainPanel } from './MainPanel';

export function AppLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={22} minSize={15} maxSize={40}>
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={78}>
          <MainPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
