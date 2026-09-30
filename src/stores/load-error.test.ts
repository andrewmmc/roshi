import { loadStoreSafely } from './load-error';
import { useToastStore } from './toast-store';

describe('loadStoreSafely', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('reports asynchronous load failures without rejecting globally', async () => {
    loadStoreSafely('history', () => Promise.reject(new Error('DB blocked')));

    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts[0]?.message).toBe(
        'Could not load history: DB blocked. Reload to retry.',
      );
    });
  });

  it('also catches synchronous loader failures', async () => {
    loadStoreSafely('providers', () => {
      throw new Error('broken loader');
    });

    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts[0]?.message).toContain(
        'broken loader',
      );
    });
  });

  it('labels environment load failures instead of falling back to unknown', async () => {
    loadStoreSafely('environments', () => Promise.reject(new Error('quota')));

    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts[0]?.message).toBe(
        'Could not load environments: quota. Reload to retry.',
      );
    });
  });
});
