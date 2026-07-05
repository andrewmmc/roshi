import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderSettings } from './ProviderManager';
import { makeProvider } from '@/__tests__/fixtures';
import { useProviderStore } from '@/stores/provider-store';

const {
  updateProvider,
  addProvider,
  deleteProvider,
  selectProvider,
  resetProvider,
  resetAllProviders,
  refreshModelCatalog,
  exportProviders,
  openModelMarket,
  mockProviders,
} = vi.hoisted(() => ({
  updateProvider: vi.fn(),
  addProvider: vi.fn(),
  deleteProvider: vi.fn(),
  selectProvider: vi.fn(),
  resetProvider: vi.fn(),
  resetAllProviders: vi.fn(),
  refreshModelCatalog: vi.fn(),
  exportProviders: vi.fn(),
  openModelMarket: vi.fn(),
  mockProviders: { value: [] as ReturnType<typeof makeProvider>[] },
}));

vi.mock('@/hooks/use-providers', () => ({
  useProviders: () => ({
    providers: mockProviders.value,
    addProvider,
    deleteProvider,
    selectProvider,
    updateProvider,
    resetProvider,
    resetAllProviders,
    refreshModelCatalog,
  }),
}));

vi.mock('@/stores/ui-store', () => ({
  useUiStore: (
    selector: (state: { openModelMarket: typeof openModelMarket }) => unknown,
  ) => selector({ openModelMarket }),
}));

vi.mock('@/utils/export', () => ({
  exportProviders,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('./ProviderForm', () => ({
  ProviderForm: React.forwardRef<
    HTMLFormElement,
    {
      initialData?: { name?: string };
      onSubmit: (data: ReturnType<typeof makeProvider>) => void;
    }
  >(function MockProviderForm({ initialData, onSubmit }, ref) {
    return (
      <form ref={ref}>
        <div>ProviderForm Mock {initialData?.name}</div>
        <button
          type="button"
          onClick={() =>
            onSubmit(
              makeProvider({
                name: 'Updated Provider',
              }),
            )
          }
        >
          Submit Mock
        </button>
      </form>
    );
  }),
}));

function renderProviderSettings() {
  const onClose = vi.fn();
  render(<ProviderSettings onClose={onClose} />);
  return { onClose };
}

describe('ProviderSettings', () => {
  beforeEach(() => {
    updateProvider.mockReset();
    addProvider.mockReset();
    deleteProvider.mockReset();
    selectProvider.mockReset();
    resetProvider.mockReset();
    resetAllProviders.mockReset();
    refreshModelCatalog.mockReset();
    exportProviders.mockReset();
    openModelMarket.mockReset();
    mockProviders.value = [
      makeProvider({
        id: 'builtin-openai',
        name: 'OpenAI',
        isBuiltIn: true,
        apiKey: 'secret',
        customHeaders: { 'X-Team': 'core' },
      }),
      makeProvider({
        id: 'custom-provider',
        name: 'My Custom',
        isBuiltIn: false,
        apiKey: '',
      }),
    ];
    useProviderStore.setState({
      providers: [
        makeProvider({ id: 'builtin-openai', name: 'OpenAI', isBuiltIn: true }),
      ],
    });
  });

  it('renders provider details in list view', async () => {
    renderProviderSettings();

    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(
      screen.getByText(/API key configured · Custom headers/),
    ).toBeInTheDocument();
  });

  it('opens the Model Market for a provider via the Manage models entry', async () => {
    const user = userEvent.setup();
    renderProviderSettings();

    await user.click(
      screen.getByRole('button', { name: /manage models for openai/i }),
    );

    expect(openModelMarket).toHaveBeenCalledWith('builtin-openai');
  });

  it('switches to edit view and updates a provider through the form', async () => {
    const user = userEvent.setup();
    renderProviderSettings();

    await user.click(
      screen.getByRole('button', { name: /edit provider openai/i }),
    );

    expect(await screen.findByText('Edit Provider')).toBeInTheDocument();
    expect(screen.getByText('ProviderForm Mock OpenAI')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit Mock' }));
    expect(updateProvider).toHaveBeenCalledWith(
      'builtin-openai',
      expect.objectContaining({ name: 'Updated Provider' }),
    );
  });

  it('opens add custom provider view and submits a new provider', async () => {
    const user = userEvent.setup();
    addProvider.mockResolvedValue(
      makeProvider({ id: 'new-id', name: 'New', isBuiltIn: false }),
    );

    renderProviderSettings();

    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(await screen.findByText('Add custom provider')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit Mock' }));

    await waitFor(() => {
      expect(addProvider).toHaveBeenCalledTimes(1);
      expect(selectProvider).toHaveBeenCalledWith('new-id');
    });
  });

  it('resets a built-in provider in edit view', async () => {
    const user = userEvent.setup();
    resetProvider.mockResolvedValue(undefined);
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'builtin-openai',
          name: 'OpenAI',
          isBuiltIn: true,
        }),
      ],
    });

    renderProviderSettings();

    await user.click(
      screen.getByRole('button', { name: /edit provider openai/i }),
    );
    await user.click(screen.getByRole('button', { name: /reset to default/i }));

    expect(resetProvider).toHaveBeenCalledWith('builtin-openai');
  });

  it('exports providers, closes, and removes custom providers', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onClose } = renderProviderSettings();

    await user.click(screen.getByRole('button', { name: /export json/i }));
    await user.click(
      screen.getByRole('button', { name: /remove custom provider my custom/i }),
    );
    await user.click(
      screen.getAllByRole('button', { name: /^close$/i }).at(-1)!,
    );

    await waitFor(() => {
      expect(exportProviders).toHaveBeenCalledWith(mockProviders.value);
    });
    expect(confirm).toHaveBeenCalledWith(
      'Remove this custom provider? This cannot be undone.',
    );
    expect(deleteProvider).toHaveBeenCalledWith('custom-provider');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows add limit messaging and alerts when the store rejects an add', async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    mockProviders.value = Array.from({ length: 3 }, (_, i) =>
      makeProvider({
        id: `custom-${i}`,
        name: `Custom ${i}`,
        isBuiltIn: false,
      }),
    );
    renderProviderSettings();

    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();

    mockProviders.value = [];
    addProvider.mockRejectedValue(new Error('MAX_CUSTOM_PROVIDERS'));
    renderProviderSettings();
    await user.click(screen.getAllByRole('button', { name: /^add$/i })[1]);
    await user.click(screen.getByRole('button', { name: 'Submit Mock' }));

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith(
        'You can add up to 3 custom providers.',
      );
    });
  });
});
