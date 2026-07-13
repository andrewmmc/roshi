import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { RawJsonView } from './RawJsonView';
import { useResponseStore } from '@/stores/response-store';
import { useToastStore } from '@/stores/toast-store';

const {
  buildCurlCommand,
  exportRawRequestJson,
  exportRawResponseJson,
  writeTextMock,
} = vi.hoisted(() => ({
  buildCurlCommand: vi.fn(() => "curl -X POST 'https://api.example.com'"),
  exportRawRequestJson: vi.fn(),
  exportRawResponseJson: vi.fn(),
  writeTextMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/curl', () => ({
  buildCurlCommand,
}));

vi.mock('@/utils/export', () => ({
  exportRawRequestJson,
  exportRawResponseJson,
}));

describe('RawJsonView', () => {
  beforeEach(() => {
    useResponseStore.getState().resetResponse();
    useToastStore.setState({ toasts: [] });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });
    buildCurlCommand.mockClear();
    exportRawRequestJson.mockReset();
    exportRawResponseJson.mockReset();
    writeTextMock.mockReset();
    writeTextMock.mockResolvedValue(undefined);
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
    expect(buildCurlCommand).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));

    expect(screen.getByText(/POST/)).toBeInTheDocument();
    expect(
      screen.getByText('https://api.example.com/v1/chat/completions'),
    ).toBeInTheDocument();
    expect(screen.getByText(/"gpt-4o-mini"/)).toBeInTheDocument();
    expect(buildCurlCommand).toHaveBeenCalledTimes(1);
  });

  it('redacts an API key embedded in the request URL query string', () => {
    useResponseStore.setState({
      rawRequest: { contents: [] },
      requestUrl:
        'https://generativelanguage.googleapis.com/v1beta/models/gemini:generateContent?key=SECRETKEY',
    });

    render(<RawJsonView />);
    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));

    expect(screen.queryByText(/SECRETKEY/)).not.toBeInTheDocument();
    expect(screen.getByText(/key=REDACTED/)).toBeInTheDocument();
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
    await act(async () => {
      fireEvent.click(
        screen.getAllByRole('button', { name: /copy to clipboard/i })[0],
      );
    });

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        "curl -X POST 'https://api.example.com'",
      );
    });
    expect(
      await screen.findByRole('button', { name: /copied/i }),
    ).toBeInTheDocument();
  });

  it('copies the exact formatted JSON for the active payload', async () => {
    useResponseStore.setState({
      rawResponse: { id: 'resp_1', ok: true },
    });

    render(<RawJsonView />);
    await act(async () => {
      fireEvent.click(
        screen.getAllByRole('button', { name: /copy to clipboard/i })[0],
      );
    });

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        JSON.stringify({ id: 'resp_1', ok: true }, null, 2),
      );
    });
  });

  it('exports the active raw payload unchanged', () => {
    useResponseStore.setState({
      rawResponse: { id: 'resp_1', ok: true },
      rawRequest: { model: 'gpt-4o-mini' },
      requestUrl: 'https://api.example.com/v1/chat/completions',
    });

    render(<RawJsonView />);

    fireEvent.click(
      screen.getByRole('button', { name: /export raw response json/i }),
    );
    expect(exportRawResponseJson).toHaveBeenCalledWith({
      id: 'resp_1',
      ok: true,
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));
    fireEvent.click(
      screen.getByRole('button', { name: /export raw request json/i }),
    );
    expect(exportRawRequestJson).toHaveBeenCalledWith({ model: 'gpt-4o-mini' });
  });
});
