import { useState, useMemo, memo } from 'react';
import { Download } from 'lucide-react';
import { useResponseStore } from '@/stores/response-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { IconButton } from '@/components/ui/icon-button';
import { EmptyState } from '@/components/ui/empty-state';
import { JsonHighlight } from '@/components/ui/json-highlight';
import { buildCurlCommand } from '@/utils/curl';
import { exportRawRequestJson, exportRawResponseJson } from '@/utils/export';
import { redactHeaders, redactUrlQueryParams } from '@/utils/redact';

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
    return <EmptyState title={`No ${label} data available`} compact />;
  }

  return <JsonHighlight json={jsonStr} />;
});

export function RawJsonView() {
  const rawRequest = useResponseStore((s) => s.rawRequest);
  const rawResponse = useResponseStore((s) => s.rawResponse);
  const requestUrl = useResponseStore((s) => s.requestUrl);
  const requestHeaders = useResponseStore((s) => s.requestHeaders);

  const [activeTab, setActiveTab] = useState('response');
  const activeData = activeTab === 'response' ? rawResponse : rawRequest;
  const activeJson = useMemo(
    () => (activeData ? JSON.stringify(activeData, null, 2) : ''),
    [activeData],
  );
  // Credentials must not be exposed in the inspector. Redact query-param keys
  // in the URL and auth header values before display / copy / cURL.
  const safeRequestUrl = useMemo(
    () => redactUrlQueryParams(requestUrl),
    [requestUrl],
  );
  const curlCommand = useMemo(
    () =>
      buildCurlCommand({
        url: safeRequestUrl,
        headers: redactHeaders(requestHeaders),
        body: rawRequest,
      }),
    [safeRequestUrl, requestHeaders, rawRequest],
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex h-full flex-col"
    >
      <div className="mt-2 flex items-center justify-between px-4">
        <TabsList variant="line" className="h-7 gap-0">
          <TabsTrigger value="response" className="px-3 text-xs">
            Response
          </TabsTrigger>
          <TabsTrigger value="request" className="px-3 text-xs">
            Request
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center">
          {activeTab === 'request' && <CopyButton text={curlCommand ?? ''} />}
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            tooltip={
              activeTab === 'response'
                ? 'Export raw response JSON'
                : 'Export raw request JSON'
            }
            disabled={!activeData}
            onClick={() =>
              activeTab === 'response'
                ? exportRawResponseJson(rawResponse)
                : exportRawRequestJson(rawRequest)
            }
          >
            <Download className="h-3.5 w-3.5" />
          </IconButton>
          <CopyButton text={activeJson} />
        </div>
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
        {safeRequestUrl && (
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="font-mono text-[13px] break-all">
              <span className="text-muted-foreground">POST </span>
              <span>{safeRequestUrl}</span>
            </div>
            <CopyButton text={safeRequestUrl} className="ml-2 shrink-0" />
          </div>
        )}
        <JsonBlock data={rawRequest} label="request" />
      </TabsContent>
    </Tabs>
  );
}
