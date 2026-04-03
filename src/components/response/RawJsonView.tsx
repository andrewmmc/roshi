import { useState, useMemo, memo } from 'react';
import { useResponseStore } from '@/stores/response-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';

const JsonBlock = memo(function JsonBlock({
  data,
  label,
}: {
  data: unknown;
  label: string;
}) {
  const jsonStr = useMemo(
    () => (data ? JSON.stringify(data, null, 2) : ''),
    [data],
  );

  if (!data) {
    return (
      <div className="text-muted-foreground p-4 text-[13px] italic">
        No {label} data available
      </div>
    );
  }

  return (
    <pre className="p-4 font-mono text-[13px] break-words whitespace-pre-wrap">
      {jsonStr}
    </pre>
  );
});

export function RawJsonView() {
  const rawRequest = useResponseStore((s) => s.rawRequest);
  const rawResponse = useResponseStore((s) => s.rawResponse);
  const requestUrl = useResponseStore((s) => s.requestUrl);

  const [activeTab, setActiveTab] = useState('response');
  const activeData = activeTab === 'response' ? rawResponse : rawRequest;
  const activeJson = useMemo(
    () => (activeData ? JSON.stringify(activeData, null, 2) : ''),
    [activeData],
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex h-full flex-col"
    >
      <div className="mt-2 flex items-center justify-between px-4">
        <TabsList className="h-7">
          <TabsTrigger value="response" className="h-6 px-2.5 text-xs">
            Response
          </TabsTrigger>
          <TabsTrigger value="request" className="h-6 px-2.5 text-xs">
            Request
          </TabsTrigger>
        </TabsList>
        <CopyButton text={activeJson} />
      </div>
      <TabsContent
        value="response"
        className="mt-0 min-h-0 flex-1 overflow-y-auto"
      >
        <JsonBlock data={rawResponse} label="response" />
      </TabsContent>
      <TabsContent
        value="request"
        className="mt-0 min-h-0 flex-1 overflow-y-auto"
      >
        {requestUrl && (
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="font-mono text-[13px] break-all">
              <span className="text-muted-foreground">POST </span>
              <span>{requestUrl}</span>
            </div>
            <CopyButton text={requestUrl} className="ml-2 shrink-0" />
          </div>
        )}
        <JsonBlock data={rawRequest} label="request" />
      </TabsContent>
    </Tabs>
  );
}
