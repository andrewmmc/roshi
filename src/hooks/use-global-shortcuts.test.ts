import { renderHook, act } from '@testing-library/react';
import { useGlobalShortcuts } from './use-global-shortcuts';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { useComposerStore } from '@/stores/composer-store';
import { useUiStore } from '@/stores/ui-store';
import { useThemeStore } from '@/stores/theme-store';

const send = vi.fn();
const cancel = vi.fn();

vi.mock('@/hooks/use-send-request', () => ({
  useSendRequest: () => ({ send, cancel }),
}));

function fireKey(
  key: string,
  opts: {
    code?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  } = {},
) {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...opts }),
    );
  });
}

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    send.mockReset();
    cancel.mockReset();
    useResponseStore.getState().resetResponse();
    useUiStore.setState({
      providerSettingsOpen: false,
      historySearchFocusGen: 0,
    });
    useThemeStore.getState().init();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
  });

  it('registers and cleans up the keydown listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useGlobalShortcuts());
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  describe('Cmd/Ctrl+Enter — send', () => {
    it('does not send when no provider is available', () => {
      renderHook(() => useGlobalShortcuts());
      fireKey('Enter', { metaKey: true });
      expect(send).not.toHaveBeenCalled();
    });

    it('sends when a provider exists and not loading', () => {
      useProviderStore.setState({ providers: [{ id: 'p1' } as never] });
      renderHook(() => useGlobalShortcuts());
      fireKey('Enter', { metaKey: true });
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('does not send when already loading', () => {
      useProviderStore.setState({ providers: [{ id: 'p1' } as never] });
      useResponseStore.setState({ isLoading: true });
      renderHook(() => useGlobalShortcuts());
      fireKey('Enter', { metaKey: true });
      expect(send).not.toHaveBeenCalled();
    });

    it('sends with ctrlKey as well', () => {
      useProviderStore.setState({ providers: [{ id: 'p1' } as never] });
      renderHook(() => useGlobalShortcuts());
      fireKey('Enter', { ctrlKey: true });
      expect(send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Escape — cancel', () => {
    it('cancels when loading and no dialog open', () => {
      useResponseStore.setState({ isLoading: true });
      renderHook(() => useGlobalShortcuts());
      fireKey('Escape');
      expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('does not cancel when not loading', () => {
      renderHook(() => useGlobalShortcuts());
      fireKey('Escape');
      expect(cancel).not.toHaveBeenCalled();
    });
  });

  describe('Cmd/Ctrl+Shift+N — new request', () => {
    it('resets composer and response when no unsaved changes', () => {
      const resetComposer = vi.spyOn(
        useComposerStore.getState(),
        'resetComposer',
      );
      const resetResponse = vi.spyOn(
        useResponseStore.getState(),
        'resetResponse',
      );

      renderHook(() => useGlobalShortcuts());
      fireKey('N', { metaKey: true, shiftKey: true });

      expect(resetComposer).toHaveBeenCalledTimes(1);
      expect(resetResponse).toHaveBeenCalledTimes(1);
    });

    it('does not reset when there are unsaved changes', () => {
      useComposerStore.setState({
        messages: [{ id: '1', role: 'user', content: 'hello' }],
      });
      // sentRequest is null so content is considered unsaved
      useResponseStore.setState({ sentRequest: null });

      const messagesBefore = useComposerStore.getState().messages;

      renderHook(() => useGlobalShortcuts());
      fireKey('N', { metaKey: true, shiftKey: true });

      expect(useComposerStore.getState().messages).toBe(messagesBefore);
    });
  });

  describe('Cmd/Ctrl+P — focus history search', () => {
    it('increments historySearchFocusGen', () => {
      expect(useUiStore.getState().historySearchFocusGen).toBe(0);
      renderHook(() => useGlobalShortcuts());
      fireKey('p', { metaKey: true });
      expect(useUiStore.getState().historySearchFocusGen).toBe(1);
    });
  });

  describe('Cmd/Ctrl+Shift+, — open provider settings', () => {
    it('sets providerSettingsOpen to true', () => {
      expect(useUiStore.getState().providerSettingsOpen).toBe(false);
      renderHook(() => useGlobalShortcuts());
      fireKey(',', { metaKey: true, shiftKey: true });
      expect(useUiStore.getState().providerSettingsOpen).toBe(true);
    });
  });

  describe('Alt+T — toggle theme', () => {
    it('toggles the theme', () => {
      const initial = useThemeStore.getState().theme;
      renderHook(() => useGlobalShortcuts());
      // Simulate Mac behaviour: ⌥T produces '†' as the key value; physical code is 'KeyT'
      fireKey('†', { altKey: true, code: 'KeyT' });
      const next = useThemeStore.getState().theme;
      expect(next).not.toBe(initial);
    });
  });

  describe('Alt+C — copy response', () => {
    it('copies response content to clipboard when available', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });

      useResponseStore.setState({
        response: { content: 'hello world', usage: null, thinking: null },
      } as never);

      renderHook(() => useGlobalShortcuts());
      // Simulate Mac behaviour: ⌥C produces 'ç' as the key value; physical code is 'KeyC'
      fireKey('ç', { altKey: true, code: 'KeyC' });

      await act(async () => {});
      expect(writeText).toHaveBeenCalledWith('hello world');
    });

    it('does nothing when no response content exists', async () => {
      const writeText = vi.fn();
      vi.stubGlobal('navigator', { clipboard: { writeText } });

      renderHook(() => useGlobalShortcuts());
      fireKey('ç', { altKey: true, code: 'KeyC' });

      await act(async () => {});
      expect(writeText).not.toHaveBeenCalled();
    });
  });
});
