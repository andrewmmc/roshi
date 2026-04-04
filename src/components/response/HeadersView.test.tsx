import { act, fireEvent, render, screen } from '@testing-library/react';
import { HeadersView } from './HeadersView';
import { useResponseStore } from '@/stores/response-store';

describe('HeadersView', () => {
  beforeEach(() => {
    useResponseStore.getState().resetResponse();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it('shows response headers by default and switches to request headers', () => {
    useResponseStore.setState({
      responseHeaders: { 'content-type': 'application/json' },
      requestHeaders: { authorization: 'Bearer demo' },
    });

    render(<HeadersView />);

    expect(screen.getByText('content-type')).toBeInTheDocument();
    expect(screen.queryByText('authorization')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));

    expect(screen.getByText('authorization')).toBeInTheDocument();
    expect(screen.queryByText('content-type')).not.toBeInTheDocument();
  });

  it('shows empty state text when no headers are available', () => {
    render(<HeadersView />);

    expect(screen.getByText('No headers available')).toBeInTheDocument();
  });

  it('copies a header cell and resets copied state after timeout', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    useResponseStore.setState({
      responseHeaders: { 'x-request-id': 'req_123' },
    });

    render(<HeadersView />);

    await act(async () => {
      fireEvent.click(screen.getByText('req_123'));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('req_123');
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText('req_123')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
