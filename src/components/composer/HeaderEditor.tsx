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
    const headers = adapter.buildRequestHeaders(provider, provider.customHeaders);
    return Object.entries(headers).map(([key, value]) => ({ key, value }));
  }, [provider]);

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { id: nanoid(), key: '', value: '' }]);
  };

  const updateKey = (index: number, key: string) => {
    setCustomHeaders(customHeaders.map((h, i) => (i === index ? { ...h, key } : h)));
  };

  const updateValue = (index: number, value: string) => {
    setCustomHeaders(customHeaders.map((h, i) => (i === index ? { ...h, value } : h)));
  };

  const removeHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {presetHeaders.length > 0 && (
        <>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            From provider
          </p>
          {presetHeaders.map(({ key, value }) => (
            <div key={key} className="flex gap-2 items-center">
              <Input
                value={key}
                readOnly
                disabled
                className="h-7 text-xs font-mono flex-1"
              />
              <Input
                value={maskHeaderValue(key, value, provider?.apiKey)}
                readOnly
                disabled
                className="h-7 text-xs font-mono flex-1"
              />
              <div className="shrink-0 h-7 w-7 flex items-center justify-center text-muted-foreground">
                <Lock className="h-3 w-3" />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-2">
            Custom
          </p>
        </>
      )}
      {customHeaders.map((header, index) => (
        <div key={header.id} className="flex gap-2 items-center">
          <Input
            value={header.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder="Header name"
            className="h-7 text-xs font-mono flex-1"
          />
          <Input
            value={header.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder="Header value"
            className="h-7 text-xs font-mono flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => removeHeader(index)}
            disabled={customHeaders.length <= 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="self-start" onClick={addHeader}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Header
      </Button>
    </div>
  );
}
