import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AboutDialog } from './AboutDialog';
import { useUiStore } from '@/stores/ui-store';

const { listenMock, openUrlMock } = vi.hoisted(() => ({
  listenMock: vi.fn(),
  openUrlMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: listenMock,
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: openUrlMock,
}));

describe('AboutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listenMock.mockResolvedValue(vi.fn());
    openUrlMock.mockResolvedValue(undefined);
    useUiStore.setState({ aboutOpen: false });
  });

  it('renders when aboutOpen is true', () => {
    useUiStore.setState({ aboutOpen: true });

    render(<AboutDialog />);

    expect(screen.getByText('About Roshi')).toBeInTheDocument();
    expect(
      screen.getByText(
        'MIT-licensed local-first workbench for testing LLM APIs',
      ),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Roshi')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('does not render when aboutOpen is false', () => {
    render(<AboutDialog />);

    expect(screen.queryByText('About Roshi')).not.toBeInTheDocument();
  });

  it('opens external links through Tauri opener', async () => {
    useUiStore.setState({ aboutOpen: true });
    render(<AboutDialog />);

    fireEvent.click(screen.getByRole('link', { name: /website/i }));

    await waitFor(() => {
      expect(openUrlMock).toHaveBeenCalledWith('https://roshi.mmc.dev/');
    });
  });

  it('falls back to window.open when Tauri opener fails', async () => {
    const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);
    openUrlMock.mockRejectedValue(new Error('not tauri'));
    useUiStore.setState({ aboutOpen: true });
    render(<AboutDialog />);

    fireEvent.click(screen.getByRole('link', { name: /privacy policy/i }));

    await waitFor(() => {
      expect(windowOpen).toHaveBeenCalledWith(
        'https://roshi.mmc.dev/privacy',
        '_blank',
        'noopener,noreferrer',
      );
    });
  });

  it('opens when the Tauri show-about event fires and unregisters on unmount', async () => {
    const unlisten = vi.fn();
    let handler: (() => void) | undefined;
    listenMock.mockImplementation(async (_event, callback) => {
      handler = callback as () => void;
      return unlisten;
    });

    const { unmount } = render(<AboutDialog />);

    await waitFor(() =>
      expect(listenMock).toHaveBeenCalledWith(
        'show-about',
        expect.any(Function),
      ),
    );
    handler?.();

    expect(useUiStore.getState().aboutOpen).toBe(true);
    unmount();
    expect(unlisten).toHaveBeenCalled();
  });
});
