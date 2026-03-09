export function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
      </span>
    </span>
  );
}
