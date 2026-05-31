import { fireEvent, render, screen } from '@testing-library/react';
import { ResponsePanel } from './ResponsePanel';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { makeProvider } from '@/__tests__/fixtures';

const { exportCurrentRequest } = vi.hoisted(() => ({
  exportCurrentRequest: vi.fn(),
}));

vi.mock('@/utils/export', () => ({
  exportCurrentRequest,
}));

vi.mock('./ChatView', () => ({
  ChatView: () => <div>ChatView Mock</div>,
}));

vi.mock('./RawJsonView', () => ({
  RawJsonView: () => <div>RawJsonView Mock</div>,
}));

vi.mock('./HeadersView', () => ({
  HeadersView: () => <div>HeadersView Mock</div>,
}));

vi.mock('./CodeView', () => ({
  CodeView: () => <div>CodeView Mock</div>,
}));

describe('ResponsePanel', () => {
  beforeEach(() => {
    useResponseStore.getState().resetResponse();
    exportCurrentRequest.mockReset();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
  });

  it('shows empty states when there is no response content', () => {
    render(<ResponsePanel />);

    expect(
      screen.getByText('Send a request to see the response'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Body' }));
    expect(
      screen.getByText('Send a request to see raw JSON'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Headers' }));
    expect(
      screen.getByText('Send a request to see headers'),
    ).toBeInTheDocument();
  });

  it('shows loading status text while sending', () => {
    useResponseStore.setState({ isLoading: true });

    render(<ResponsePanel />);

    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sending request...');
  });

  it('renders response metadata and enables the code tab for supported providers', async () => {
    useProviderStore.setState({
      providers: [makeProvider({ id: 'p1', type: 'anthropic' })],
      selectedProviderId: 'p1',
    });
    useResponseStore.setState({
      response: {
        id: 'resp_1',
        model: 'claude',
        content: 'Hello',
        role: 'assistant',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      },
      statusCode: 200,
      durationMs: 321,
    });

    render(<ResponsePanel />);

    expect(await screen.findByText('ChatView Mock')).toBeInTheDocument();
    expect(screen.getByText('15 tokens')).toBeInTheDocument();
    expect(screen.getByText('200 Success')).toBeInTheDocument();
    expect(screen.getByText('321ms')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Code' })).toBeEnabled();

    fireEvent.click(screen.getByRole('tab', { name: 'Body' }));
    expect(await screen.findByText('RawJsonView Mock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Headers' }));
    expect(await screen.findByText('HeadersView Mock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Code' }));
    expect(await screen.findByText('CodeView Mock')).toBeInTheDocument();
  });

  it('shows streaming status text', () => {
    useResponseStore.setState({ isLoading: true, isStreaming: true });

    render(<ResponsePanel />);

    expect(screen.getByText('Streaming...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Streaming response...',
    );
  });

  it('renders error metadata and exports the current request', () => {
    useResponseStore.setState({
      error: 'Bad request',
      statusCode: 400,
      durationMs: 20,
      rawRequest: { model: 'gpt-4' },
      rawResponse: { error: 'bad' },
    });

    render(<ResponsePanel />);

    expect(screen.getByRole('status')).toHaveTextContent('Error: Bad request');
    expect(screen.getByText('400 Error')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: /export request and response as json/i,
      }),
    );

    expect(exportCurrentRequest).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Bad request', statusCode: 400 }),
    );
  });

  it('disables the code tab without a supported provider', () => {
    render(<ResponsePanel />);

    expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
