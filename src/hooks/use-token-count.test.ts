import { renderHook, act } from '@testing-library/react';
import { useTokenCount } from './use-token-count';
import { useComposerStore } from '@/stores/composer-store';

const mockEstimateTokenCount = vi.fn();
vi.mock('@/utils/token-count', () => ({
  estimateTokenCount: (...args: unknown[]) => mockEstimateTokenCount(...args),
}));

describe('useTokenCount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockEstimateTokenCount.mockResolvedValue(42);
    useComposerStore.setState({ messages: [], systemPrompt: '' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns null initially before debounce fires', () => {
    const { result } = renderHook(() => useTokenCount());
    expect(result.current).toBeNull();
  });

  it('returns token count after debounce delay', async () => {
    const { result } = renderHook(() => useTokenCount());

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockEstimateTokenCount).toHaveBeenCalledWith([], '');
    expect(result.current).toBe(42);
  });

  it('debounces rapid changes and only calls estimateTokenCount once', async () => {
    const { result } = renderHook(() => useTokenCount());

    // Simulate rapid message changes before debounce fires
    act(() => {
      useComposerStore.setState({
        messages: [
          { id: '1', role: 'user', content: 'hello', attachments: [] },
        ],
      });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      useComposerStore.setState({
        messages: [
          { id: '1', role: 'user', content: 'hello world', attachments: [] },
        ],
      });
    });

    mockEstimateTokenCount.mockResolvedValue(99);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Should only have been called with the final state
    const lastCall =
      mockEstimateTokenCount.mock.calls[
        mockEstimateTokenCount.mock.calls.length - 1
      ];
    expect(lastCall[0]).toEqual([
      { id: '1', role: 'user', content: 'hello world', attachments: [] },
    ]);
    expect(result.current).toBe(99);
  });

  it('updates when systemPrompt changes', async () => {
    mockEstimateTokenCount.mockResolvedValue(10);
    const { result } = renderHook(() => useTokenCount());

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(10);

    mockEstimateTokenCount.mockResolvedValue(25);
    act(() => {
      useComposerStore.setState({ systemPrompt: 'You are helpful.' });
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockEstimateTokenCount).toHaveBeenCalledWith([], 'You are helpful.');
    expect(result.current).toBe(25);
  });
});
