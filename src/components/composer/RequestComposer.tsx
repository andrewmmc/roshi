import { MessageEditor } from './MessageEditor';
import { ParameterControls } from './ParameterControls';
import { HeaderEditor } from './HeaderEditor';
import { ScrollArea } from '@/components/ui/scroll-area';

export function RequestComposer() {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        <MessageEditor />
        <ParameterControls />
        <HeaderEditor />
      </div>
    </ScrollArea>
  );
}
