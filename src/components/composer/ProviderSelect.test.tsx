import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderSelect } from './ProviderSelect';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { makeModel, makeProvider } from '@/__tests__/fixtures';

vi.mock('@/components/ui/select', async () => {
  const mocks = await import('@/__tests__/mock-select');
  return mocks;
});

describe('ProviderSelect', () => {
  beforeEach(() => {
    useUiStore.setState(useUiStore.getInitialState(), true);
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
      load: vi.fn().mockResolvedValue(undefined),
      selectProvider: vi.fn(),
      selectModel: vi.fn(),
    });
  });

  it('loads providers on mount when the store is not loaded', () => {
    const load = vi.fn().mockResolvedValue(undefined);
    useProviderStore.setState({ loaded: false, load });

    render(<ProviderSelect />);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shows the seeding state', () => {
    useProviderStore.setState({ seeding: true });

    render(<ProviderSelect />);

    expect(screen.getByText('Loading providers…')).toBeInTheDocument();
  });

  it('renders providers and models and dispatches selections', async () => {
    const user = userEvent.setup();
    const selectProvider = vi.fn();
    const selectModel = vi.fn();
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'p1',
          name: 'OpenAI',
          models: [
            makeModel({ id: 'm1', displayName: 'GPT-4.1' }),
            makeModel({ id: 'm2', displayName: 'GPT-4o' }),
          ],
        }),
      ],
      selectedProviderId: 'p1',
      selectedModelId: 'm1',
      selectProvider,
      selectModel,
    });

    render(<ProviderSelect />);

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'p1');
    await user.selectOptions(selects[1], 'm2');

    expect(selectProvider).toHaveBeenCalledWith('p1');
    expect(selectModel).toHaveBeenCalledWith('m2');
  });

  it('shows Add provider inside the provider dropdown', async () => {
    const user = userEvent.setup();
    useUiStore.setState({ settingsOpen: false, settingsPage: 'general' });
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'p1',
          name: 'OpenAI',
        }),
      ],
      selectedProviderId: 'p1',
    });

    render(<ProviderSelect />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: /select provider/i }),
      '__add_provider__',
    );

    expect(useUiStore.getState().settingsOpen).toBe(true);
    expect(useUiStore.getState().settingsPage).toBe('providers');
  });

  it('shows Browse models inside the model dropdown when the selected provider has no models', async () => {
    const user = userEvent.setup();
    const openModelMarket = vi.fn();
    useUiStore.setState({ openModelMarket });
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'p1',
          name: 'OpenAI',
          models: [],
        }),
      ],
      selectedProviderId: 'p1',
      selectedModelId: null,
    });

    render(<ProviderSelect />);

    expect(
      screen.queryByRole('button', { name: /browse models/i }),
    ).not.toBeInTheDocument();
    const modelSelect = screen.getByRole('combobox', { name: /select model/i });
    await user.selectOptions(modelSelect, '__browse_models__');

    expect(openModelMarket).toHaveBeenCalledWith('p1');
    expect(
      screen.getByRole('option', { name: /browse models/i }),
    ).toBeInTheDocument();
  });

  it('enables model selection for google gemini and displays available models', async () => {
    const user = userEvent.setup();
    const selectModel = vi.fn();
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'g1',
          type: 'google-gemini',
          name: 'Gemini',
          models: [
            makeModel({
              id: 'gemini-2.5-pro',
              displayName: 'Gemini 2.5 Pro',
            }),
            makeModel({
              id: 'gemini-2.0-flash',
              displayName: 'Gemini 2.0 Flash',
            }),
          ],
        }),
      ],
      selectedProviderId: 'g1',
      selectedModelId: 'gemini-2.5-pro',
      selectModel,
    });

    render(<ProviderSelect />);

    const selects = screen.getAllByRole('combobox');
    expect(selects[1]).not.toBeDisabled();

    await user.selectOptions(selects[1], 'gemini-2.0-flash');

    expect(selectModel).toHaveBeenCalledWith('gemini-2.0-flash');
  });
});
