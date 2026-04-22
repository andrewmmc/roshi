import { useEffect, useRef, useState, useCallback } from 'react';
import { useToastStore, type Toast as ToastItem } from '@/stores/toast-store';

function ToastMessage({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Wait for exit animation before removing from store
    setTimeout(() => removeToast(toast.id), 150);
  }, [removeToast, toast.id]);

  useEffect(() => {
    // Trigger enter animation on next frame
    requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(dismiss, toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.duration, dismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`bg-foreground text-background pointer-events-auto rounded-lg px-3.5 py-2 text-[13px] font-medium shadow-lg transition-all duration-150 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      {toast.message}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} />
      ))}
    </div>
  );
}
