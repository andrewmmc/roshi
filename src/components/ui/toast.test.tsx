import { act, render, screen } from '@testing-library/react';
import { ToastContainer } from './toast';
import { toast, useToastStore } from '@/stores/toast-store';

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders toasts and removes them after their duration', () => {
    toast('Saved', 1000);

    render(<ToastContainer />);

    expect(screen.getByRole('status')).toHaveTextContent('Saved');

    act(() => {
      vi.advanceTimersByTime(1150);
    });

    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('renders nothing without toasts', () => {
    const { container } = render(<ToastContainer />);

    expect(container).toBeEmptyDOMElement();
  });
});
