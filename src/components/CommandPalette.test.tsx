import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './CommandPalette';
import { useComposerStore } from '@/stores/composer-store';
import { useEvalStore } from '@/stores/eval-store';
import { useProviderStore } from '@/stores/provider-store';
import { useResponseStore } from '@/stores/response-store';
import { useTabStore } from '@/stores/tab-store';
import { useUiStore } from '@/stores/ui-store';
import { makeModel, makeProvider } from '@/__tests__/fixtures';

const { send, cancel } = vi.hoisted(() => ({
  send: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('@/hooks/use-send-request', () => ({
  useSendRequest: () => ({ send, cancel }),
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    send.mockReset();
    cancel.mockReset();
    useComposerStore.setState(useComposerStore.getInitialState(), true);
    useResponseStore.setState(useResponseStore.getInitialState(), true);
    useTabStore.setState(useTabStore.getInitialState(), true);
    useEvalStore.getState().reset();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
    useUiStore.setState({
      commandPaletteOpen: true,
      commandPaletteOpenCount: 1,
      mainView: 'request',
      newRequestDiscardOpen: false,
      pendingTabCloseId: null,
    });
  });

  it('shows unavailable actions with a reason', async () => {
    render(<CommandPalette />);

    const sendOption = (await screen.findByText('Send Request')).closest(
      'button',
    );
    expect(sendOption).toBeDisabled();
    expect(screen.getByText('Select a provider')).toBeInTheDocument();

    const closeOption = screen.getByText('Close Tab').closest('button');
    expect(closeOption).toBeDisabled();
    expect(
      screen.getByText('At least one request tab stays open'),
    ).toBeInTheDocument();
  });

  it('finds commands by intent keywords', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    const search = await screen.findByRole('combobox', {
      name: 'Search commands',
    });
    await user.type(search, 'credentials');

    expect(screen.getByText('Settings: Providers')).toBeInTheDocument();
    expect(screen.queryByText('Settings: General')).not.toBeInTheDocument();
  });

  it('enables send when the selected provider, model, and key are ready', async () => {
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

    render(<CommandPalette />);

    const sendOption = (await screen.findByText('Send Request')).closest(
      'button',
    );
    expect(sendOption).toBeEnabled();
  });

  it('routes a guarded close through the global discard confirmation', async () => {
    const user = userEvent.setup();
    useTabStore.getState().createTab();
    useComposerStore.setState({
      messages: [{ id: '1', role: 'user', content: 'keep this tab' }],
    });
    const activeTabId = useTabStore.getState().activeTabId;
    render(<CommandPalette />);

    const search = await screen.findByRole('combobox', {
      name: 'Search commands',
    });
    await user.type(search, 'close tab');
    await user.click(screen.getByText('Close Tab'));

    expect(useUiStore.getState().pendingTabCloseId).toBe(activeTabId);
    expect(await screen.findByText('Close tab?')).toBeInTheDocument();
  });
});
