import { RequestCompatibilityWarning } from '@/components/composer/RequestCompatibilityWarning';
import { FirstRunChecklist } from '@/components/onboarding/FirstRunChecklist';
import { useRequestCompatibilityPreview } from '@/hooks/use-request-compatibility-preview';

export function AppBanner() {
  const { warnings } = useRequestCompatibilityPreview();

  if (warnings.length > 0) {
    return (
      <div className="border-border/70 shrink-0 border-b px-4 py-2">
        <RequestCompatibilityWarning />
      </div>
    );
  }

  return <FirstRunChecklist />;
}
