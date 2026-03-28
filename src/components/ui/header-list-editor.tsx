import { useRef } from 'react';
import { nanoid } from 'nanoid';
import { Trash2 } from 'lucide-react';
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
  // Keep a stable ID for the empty entry across re-renders
  const emptyEntryIdRef = useRef<string>(nanoid());

  // Ensure at least one empty header entry exists for display
  const hasEmptyEntry = headers.some((h) => !h.key && !h.value);
  const displayHeaders = hasEmptyEntry ? headers : [...headers, { id: emptyEntryIdRef.current, key: '', value: '' }];

  const updateKey = (index: number, key: string) => {
    // When updating, ensure we always keep the empty entry at the end if needed
    const updated = displayHeaders.map((h, i) => (i === index ? { ...h, key } : h));
    // Check if we still have an empty entry after the update
    const stillHasEmpty = updated.some((h) => !h.key && !h.value);
    // If the updated entry is no longer empty and we don't have another empty entry, add one
    if (!stillHasEmpty && (key || displayHeaders[index]?.value)) {
      updated.push({ id: emptyEntryIdRef.current, key: '', value: '' });
    }
    onChange(updated);
  };

  const updateValue = (index: number, value: string) => {
    const updated = displayHeaders.map((h, i) => (i === index ? { ...h, value } : h));
    const stillHasEmpty = updated.some((h) => !h.key && !h.value);
    if (!stillHasEmpty && (value || displayHeaders[index]?.key)) {
      updated.push({ id: emptyEntryIdRef.current, key: '', value: '' });
    }
    onChange(updated);
  };

  const removeHeader = (index: number) => {
    const filtered = displayHeaders.filter((_, i) => i !== index);
    // Always ensure at least one empty entry remains
    if (filtered.length === 0 || !filtered.some((h) => !h.key && !h.value)) {
      filtered.push({ id: emptyEntryIdRef.current, key: '', value: '' });
    }
    onChange(filtered);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <Label className="text-xs">{label}</Label>}
      {displayHeaders.map((header, index) => (
        <div key={header.id} className="flex gap-2 items-center">
          <Input
            value={header.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder={placeholderKey}
            className="h-8 text-xs font-mono flex-1"
          />
          <Input
            value={header.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder={placeholderValue}
            className="h-8 text-xs font-mono flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => removeHeader(index)}
            disabled={displayHeaders.length <= 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
