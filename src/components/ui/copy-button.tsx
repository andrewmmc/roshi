import { useState, useRef, useCallback, useEffect } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import { KbdShortcut } from '@/components/ui/tooltip';
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
      size="icon"
      className={`text-muted-foreground hover:text-foreground h-7 w-7 ${className ?? ''}`}
      onClick={handleCopy}
      disabled={!text}
      tooltip={tooltipContent}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </IconButton>
  );
}
