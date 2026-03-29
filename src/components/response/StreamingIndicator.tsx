export function StreamingIndicator() {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1">
      <span className="flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
      </span>
    </span>
  );
}
