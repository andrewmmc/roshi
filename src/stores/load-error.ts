import { toErrorMessage } from '@/lib/errors';
import { toast } from '@/stores/toast-store';
import { translateNow, type MessageKey } from '@/i18n';

const RESOURCE_LABEL_KEYS: Record<string, MessageKey> = {
  providers: 'common.resourceProviders',
  history: 'common.resourceHistory',
  'proxy settings': 'common.resourceProxy',
  'eval runs': 'common.resourceEvalRuns',
  collections: 'common.resourceCollections',
};

export function loadStoreSafely(
  resource: string,
  load: () => Promise<void>,
): void {
  const report = (error: unknown) => {
    const label = translateNow(
      RESOURCE_LABEL_KEYS[resource] ?? 'common.unknown',
    );
    const detail = toErrorMessage(
      error,
      translateNow('common.localStorageUnavailable'),
    );
    toast(translateNow('common.loadFailed', { resource: label, detail }), 6000);
  };
  try {
    void Promise.resolve(load()).catch(report);
  } catch (error) {
    report(error);
  }
}
