export function StreamingIndicator() {
  return (
    <span
      className="text-muted-foreground inline-flex items-center gap-1"
      aria-label="Response is streaming"
    >
      <span className="flex gap-0.5" aria-hidden="true">
        <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
      </span>
      <span className="sr-only">Response is streaming</span>
    </span>
  );
}
