import { act, renderHook } from '@testing-library/react';
import { useRequestSession } from './use-request-session';

const {
  hydrate,
  persistRequestSessionNow,
  scheduleRequestSessionPersistence,
  subscribe,
  unsubscribe,
} = vi.hoisted(() => ({
  hydrate: vi.fn<() => Promise<void>>(),
  persistRequestSessionNow: vi.fn<() => Promise<void>>(),
  scheduleRequestSessionPersistence: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/stores/tab-store', () => ({
  persistRequestSessionNow,
  scheduleRequestSessionPersistence,
  useTabStore: (selector: (state: { hydrate: typeof hydrate }) => unknown) =>
    selector({ hydrate }),
}));

vi.mock('@/stores/composer-store', () => ({
  useComposerStore: { subscribe },
}));

describe('useRequestSession', () => {
  let resolveHydration: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    hydrate.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveHydration = resolve;
        }),
    );
    persistRequestSessionNow.mockResolvedValue(undefined);
    subscribe.mockReturnValue(unsubscribe);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  it('hydrates before subscribing and persists composer changes', async () => {
    renderHook(() => useRequestSession());

    expect(hydrate).toHaveBeenCalledOnce();
    expect(subscribe).not.toHaveBeenCalled();

    await act(async () => resolveHydration());

    expect(subscribe).toHaveBeenCalledOnce();
    const onComposerChange = subscribe.mock.calls[0][0];
    onComposerChange();
    expect(scheduleRequestSessionPersistence).toHaveBeenCalledOnce();
  });

  it('flushes on page exit, when hidden, and during cleanup', async () => {
    const { unmount } = renderHook(() => useRequestSession());
    await act(async () => resolveHydration());

    window.dispatchEvent(new Event('pagehide'));
    expect(persistRequestSessionNow).toHaveBeenCalledOnce();

    document.dispatchEvent(new Event('visibilitychange'));
    expect(persistRequestSessionNow).toHaveBeenCalledOnce();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(persistRequestSessionNow).toHaveBeenCalledTimes(2);

    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(persistRequestSessionNow).toHaveBeenCalledTimes(3);

    window.dispatchEvent(new Event('pagehide'));
    expect(persistRequestSessionNow).toHaveBeenCalledTimes(3);
  });

  it('does not subscribe if unmounted before hydration completes', async () => {
    const { unmount } = renderHook(() => useRequestSession());
    unmount();

    await act(async () => resolveHydration());

    expect(subscribe).not.toHaveBeenCalled();
    expect(persistRequestSessionNow).toHaveBeenCalledOnce();
  });
});
