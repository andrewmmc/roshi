import { useEffect, useRef, useState } from 'react';

/**
 * Observes a container element via ResizeObserver and returns `narrow: true`
 * when its content width falls below the given pixel `threshold`.
 *
 * Attach `containerRef` to the element you want to observe.
 */
export function useContainerBreakpoint(threshold: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setNarrow(entry.contentRect.width < threshold);
      }
    });
    setNarrow(el.getBoundingClientRect().width < threshold);
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { containerRef, narrow };
}
