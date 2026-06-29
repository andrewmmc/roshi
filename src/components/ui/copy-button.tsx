import { useState, useRef, useCallback, useEffect } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import { KbdShortcut } from '@/components/ui/kbd';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';

export function CopyButton({
  text,
  className,
  shortcut,
}: {
  text: string;
  className?: string;
  shortcut?: { mac: string; win: string };
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    if (!mountedRef.current) return;
    setCopied(true);
    toast('Copied to clipboard');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [text]);

  const tooltipContent =
    copied || !shortcut ? (
      copied ? (
        'Copied'
      ) : (
        'Copy to clipboard'
      )
    ) : (
      <span className="flex items-center gap-1.5">
        Copy to clipboard
        <KbdShortcut mac={shortcut.mac} win={shortcut.win} />
      </span>
    );

  return (
    <IconButton
      variant="ghost"
      size="icon-sm"
      className={cn('text-muted-foreground hover:text-foreground', className)}
      onClick={handleCopy}
      disabled={!text}
      tooltip={tooltipContent}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </IconButton>
  );
}
