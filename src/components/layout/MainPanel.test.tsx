import { fireEvent, render, screen } from '@testing-library/react';
import { MainPanel } from './MainPanel';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { useToastStore } from '@/stores/toast-store';
import { useUiStore } from '@/stores/ui-store';
import { makeModel, makeProvider } from '@/__tests__/fixtures';

const { send, cancel, seedFromMainComposer } = vi.hoisted(() => ({
  send: vi.fn(),
  cancel: vi.fn(),
  seedFromMainComposer: vi.fn(),
}));

vi.mock('@/components/composer/RequestComposer', () => ({
  RequestComposer: () => <div>RequestComposer Mock</div>,
}));

vi.mock('@/components/response/ResponsePanel', () => ({
  ResponsePanel: () => <div>ResponsePanel Mock</div>,
}));

vi.mock('@/components/composer/ProviderSelect', () => ({
  ProviderSelect: () => <div>ProviderSelect Mock</div>,
}));

vi.mock('@/components/environments/EnvironmentManager', () => ({
  EnvironmentSelector: () => <div>EnvironmentSelector Mock</div>,
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

vi.mock('@/components/onboarding/FirstRunChecklist', () => ({
  FirstRunChecklist: () => null,
}));

vi.mock('@/components/composer/RequestCompatibilityWarning', () => ({
  RequestCompatibilityWarning: () => null,
}));

vi.mock('@/stores/eval-store', () => ({
  useEvalStore: (
    selector: (state: { seedFromMainComposer: () => void }) => unknown,
  ) => selector({ seedFromMainComposer }),
}));

vi.mock('@/hooks/use-send-request', () => ({
  useSendRequest: () => ({ send, cancel }),
}));

describe('MainPanel', () => {
  beforeEach(() => {
    send.mockReset();
    cancel.mockReset();
    seedFromMainComposer.mockReset();
    useResponseStore.getState().resetResponse();
    useToastStore.setState({ toasts: [] });
    useUiStore.setState({ mainView: 'request', sidebarCollapsed: false });
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

    expect(
      screen.getByRole('button', { name: (name) => name.startsWith('Send') }),
    ).toBeDisabled();
  });

  it('sends on button click when a provider exists', () => {
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'p1',
          apiKey: 'test-key',
          models: [makeModel({ id: 'm1' })],
        }),
      ],
      selectedProviderId: 'p1',
      selectedModelId: 'm1',
    });

    render(<MainPanel />);

    fireEvent.click(
      screen.getByRole('button', { name: (name) => name.startsWith('Send') }),
    );

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('moves compare into the send actions menu and shows feedback', async () => {
    render(<MainPanel />);

    expect(screen.queryByRole('button', { name: /^compare$/i })).toBeNull();

    fireEvent.click(screen.getByLabelText('More send actions'));
    fireEvent.click(await screen.findByText('Compare prompt across models'));

    expect(seedFromMainComposer).toHaveBeenCalledTimes(1);
    expect(useUiStore.getState().mainView).toBe('eval');
    expect(useToastStore.getState().toasts[0]?.message).toBe(
      'Prompt copied to eval. Add models, then run compare.',
    );
  });

  it('shows the stop button while loading', () => {
    useProviderStore.setState({ providers: [{ id: 'p1' } as never] });
    useResponseStore.setState({ isLoading: true });

    render(<MainPanel />);

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
