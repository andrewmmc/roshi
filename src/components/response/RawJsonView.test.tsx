import { fireEvent, render, screen } from '@testing-library/react';
import { RawJsonView } from './RawJsonView';
import { useResponseStore } from '@/stores/response-store';
import { useToastStore } from '@/stores/toast-store';

describe('RawJsonView', () => {
  beforeEach(() => {
    useResponseStore.getState().resetResponse();
    useToastStore.setState({ toasts: [] });
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('shows response JSON by default and switches to request JSON', () => {
    useResponseStore.setState({
      rawResponse: { id: 'resp_1', ok: true },
      rawRequest: { model: 'gpt-4o-mini' },
      requestUrl: 'https://api.example.com/v1/chat/completions',
    });

    render(<RawJsonView />);

    expect(screen.getByText(/"resp_1"/)).toBeInTheDocument();
    expect(screen.queryByText(/"gpt-4o-mini"/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));

    expect(screen.getByText(/POST/)).toBeInTheDocument();
    expect(
      screen.getByText('https://api.example.com/v1/chat/completions'),
    ).toBeInTheDocument();
    expect(screen.getByText(/"gpt-4o-mini"/)).toBeInTheDocument();
  });

  it('shows the empty state when no raw payloads are available', () => {
    render(<RawJsonView />);

    expect(screen.getByText('No response data available')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));
    expect(screen.getByText('No request data available')).toBeInTheDocument();
  });

  it('copies the request as cURL when request data is available', async () => {
    useResponseStore.setState({
      rawRequest: { model: 'gpt-4o-mini' },
      requestUrl: 'https://api.example.com/v1/chat/completions',
      requestHeaders: { Authorization: 'Bearer token' },
    });

    render(<RawJsonView />);
    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));
    fireEvent.click(screen.getByRole('button', { name: /copy as curl/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('curl'),
    );
    expect(
      await screen.findByRole('button', { name: /copied/i }),
    ).toBeInTheDocument();
  });
});
