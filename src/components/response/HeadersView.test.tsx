import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

    expect(
      screen.getByRole('tab', { name: 'Response', selected: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('content-type')).toBeVisible();
    expect(screen.queryByText('authorization')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));

    expect(
      screen.getByRole('tab', { name: 'Request', selected: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('authorization')).toBeVisible();
  });

  it('shows empty state text when no headers are available', () => {
    render(<HeadersView />);

    expect(screen.getByText('No headers available')).toBeInTheDocument();
  });

  it('copies a header value and resets copied state after timeout', async () => {
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

    // Each row has two CopyButtons (key + value). Get the value cell's button.
    const valueCell = screen.getByText('req_123').closest('td')!;
    const copyBtn = within(valueCell).getByRole('button', {
      name: /copy to clipboard/i,
    });

    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('req_123');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getAllByRole('button', { name: /copy to clipboard/i }),
    ).toHaveLength(2);
    vi.useRealTimers();
  });
});
