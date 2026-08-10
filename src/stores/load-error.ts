import { toErrorMessage } from '@/lib/errors';
import { toast } from '@/stores/toast-store';

export function loadStoreSafely(
  resource: string,
  load: () => Promise<void>,
): void {
  const report = (error: unknown) => {
    const detail = toErrorMessage(error, 'Local storage is unavailable');
    toast(`Could not load ${resource}: ${detail}. Reload to retry.`, 6000);
  };
  try {
    void Promise.resolve(load()).catch(report);
  } catch (error) {
    report(error);
  }
}
