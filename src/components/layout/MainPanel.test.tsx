import { fireEvent, render, screen } from '@testing-library/react';
import { MainPanel } from './MainPanel';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';

const send = vi.fn();
const cancel = vi.fn();

vi.mock('@/components/composer/RequestComposer', () => ({
  RequestComposer: () => <div>RequestComposer Mock</div>,
}));

vi.mock('@/components/response/ResponsePanel', () => ({
  ResponsePanel: () => <div>ResponsePanel Mock</div>,
}));

vi.mock('@/components/composer/ProviderSelect', () => ({
  ProviderSelect: () => <div>ProviderSelect Mock</div>,
}));

vi.mock('@/components/composer/TokenCountBadge', () => ({
  TokenCountBadge: () => <div>TokenCountBadge Mock</div>,
}));

vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResizableHandle: () => <div />,
}));

vi.mock('@/hooks/use-send-request', () => ({
  useSendRequest: () => ({ send, cancel }),
}));

describe('MainPanel', () => {
  beforeEach(() => {
    send.mockReset();
    cancel.mockReset();
    useResponseStore.getState().resetResponse();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
  });

  it('disables sending when no providers exist', () => {
    render(<MainPanel />);

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('sends on button click when a provider exists', () => {
    useProviderStore.setState({ providers: [{ id: 'p1' } as never] });

    render(<MainPanel />);

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('shows the stop button while loading', () => {
    useProviderStore.setState({ providers: [{ id: 'p1' } as never] });
    useResponseStore.setState({ isLoading: true });

    render(<MainPanel />);

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
