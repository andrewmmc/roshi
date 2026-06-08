import { AlertTriangle } from 'lucide-react';
import { useRequestCompatibilityPreview } from '@/hooks/use-request-compatibility-preview';

export function RequestCompatibilityWarning() {
  const { warnings } = useRequestCompatibilityPreview();

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-950 dark:text-amber-100"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-medium">
            Some settings will be omitted when sending
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
