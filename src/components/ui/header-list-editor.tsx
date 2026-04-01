import { nanoid } from 'nanoid';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

interface HeaderListEditorProps {
  headers: HeaderEntry[];
  onChange: (headers: HeaderEntry[]) => void;
  label?: string;
  placeholderKey?: string;
  placeholderValue?: string;
}

export function HeaderListEditor({
  headers,
  onChange,
  label = 'Headers',
  placeholderKey = 'Header name',
  placeholderValue = 'Header value',
}: HeaderListEditorProps) {
  const updateKey = (index: number, key: string) => {
    onChange(headers.map((h, i) => (i === index ? { ...h, key } : h)));
  };

  const updateValue = (index: number, value: string) => {
    onChange(headers.map((h, i) => (i === index ? { ...h, value } : h)));
  };

  const removeHeader = (index: number) => {
    onChange(headers.filter((_, i) => i !== index));
  };

  const addHeader = () => {
    onChange([...headers, { id: nanoid(), key: '', value: '' }]);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <Label className="text-xs">{label}</Label>}
      {headers.map((header, index) => (
        <div key={header.id} className="flex items-center gap-2">
          <Input
            value={header.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder={placeholderKey}
            className="h-8 flex-1 font-mono text-xs"
          />
          <Input
            value={header.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder={placeholderValue}
            className="h-8 flex-1 font-mono text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
            onClick={() => removeHeader(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
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
