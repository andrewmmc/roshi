import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { RequestComposer } from '@/components/composer/RequestComposer';
import { ResponsePanel } from '@/components/response/ResponsePanel';

export function MainPanel() {
  return (
    <div className="h-full bg-background">
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel defaultSize="40%" minSize="20%">
          <RequestComposer />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="60%" minSize="20%">
          <ResponsePanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
