import { useMemo } from 'react';
import { nanoid } from 'nanoid';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRequestStore } from '@/stores/request-store';
import { useSelectedProvider } from '@/stores/provider-store';
import { getAdapter } from '@/adapters';
import { maskHeaderValue } from '@/components/ui/header-utils';

export function HeaderEditor() {
  const customHeaders = useRequestStore((s) => s.customHeaders);
  const setCustomHeaders = useRequestStore((s) => s.setCustomHeaders);
  const provider = useSelectedProvider();

  const presetHeaders = useMemo(() => {
    if (!provider) return [];
    const adapter = getAdapter(provider);
    const headers = adapter.buildRequestHeaders(
      provider,
      provider.customHeaders,
    );
    return Object.entries(headers).map(([key, value]) => ({ key, value }));
  }, [provider]);

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { id: nanoid(), key: '', value: '' }]);
  };

  const updateKey = (index: number, key: string) => {
    setCustomHeaders(
      customHeaders.map((h, i) => (i === index ? { ...h, key } : h)),
    );
  };

  const updateValue = (index: number, value: string) => {
    setCustomHeaders(
      customHeaders.map((h, i) => (i === index ? { ...h, value } : h)),
    );
  };

  const removeHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {presetHeaders.length > 0 && (
        <>
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            From provider
          </p>
          {presetHeaders.map(({ key, value }) => (
            <div key={key} className="flex items-center gap-2">
              <Input
                value={key}
                readOnly
                disabled
                className="h-7 flex-1 font-mono text-xs"
              />
              <Input
                value={maskHeaderValue(key, value, provider?.apiKey)}
                readOnly
                disabled
                className="h-7 flex-1 font-mono text-xs"
              />
              <div className="text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center">
                <Lock className="h-3 w-3" />
              </div>
            </div>
          ))}
          <p className="text-muted-foreground mt-2 text-[11px] font-medium tracking-wider uppercase">
            Custom
          </p>
        </>
      )}
      {customHeaders.map((header, index) => (
        <div key={header.id} className="flex items-center gap-2">
          <Input
            value={header.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder="Header name"
            className="h-7 flex-1 font-mono text-xs"
          />
          <Input
            value={header.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder="Header value"
            className="h-7 flex-1 font-mono text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
            onClick={() => removeHeader(index)}
            disabled={customHeaders.length <= 1}
            aria-label="Remove header"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={addHeader}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Header
      </Button>
    </div>
  );
}
