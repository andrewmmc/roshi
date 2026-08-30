import { nanoid } from 'nanoid';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import type { HeaderEntry } from '@/utils/headers';

export type { HeaderEntry } from '@/utils/headers';

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
  label,
  placeholderKey,
  placeholderValue,
}: HeaderListEditorProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('request.headers');
  const resolvedPlaceholderKey = placeholderKey ?? t('request.headerName');
  const resolvedPlaceholderValue = placeholderValue ?? t('request.headerValue');
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
      {resolvedLabel && <Label className="text-xs">{resolvedLabel}</Label>}
      {headers.map((header, index) => (
        <div key={header.id} className="flex items-center gap-2">
          <Input
            aria-label={t('request.headerNameAria', { index: index + 1 })}
            value={header.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder={resolvedPlaceholderKey}
            className="h-8 flex-1 font-mono text-xs"
          />
          <Input
            aria-label={t('request.headerValueAria', { index: index + 1 })}
            value={header.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder={resolvedPlaceholderValue}
            className="h-8 flex-1 font-mono text-xs"
          />
          <IconButton
            tooltip={t('request.removeHeader')}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => removeHeader(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
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
        {t('request.addHeader')}
      </Button>
    </div>
  );
}
