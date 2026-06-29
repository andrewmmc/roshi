import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ModelMarket } from './ModelMarket';
import { useUiStore } from '@/stores/ui-store';
import { makeModel, makeProvider } from '@/__tests__/fixtures';
import type { ProviderModel } from '@/types/provider';

const {
  addModelToProvider,
  removeModelFromProvider,
  refreshModelCatalog,
  loadProviders,
  loadCatalog,
  catalogState,
  mockProviders,
  providerStoreState,
} = vi.hoisted(() => ({
  addModelToProvider: vi.fn().mockResolvedValue(undefined),
  removeModelFromProvider: vi.fn().mockResolvedValue(undefined),
  refreshModelCatalog: vi.fn().mockResolvedValue(undefined),
  loadProviders: vi.fn().mockResolvedValue(undefined),
  loadCatalog: vi.fn().mockResolvedValue(undefined),
  catalogState: {
    models: {} as Record<string, ProviderModel[]>,
    status: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
    error: null as string | null,
  },
  mockProviders: { value: [] as ReturnType<typeof makeProvider>[] },
  providerStoreState: {
    loaded: true,
    seeding: false,
    refreshingCatalog: false,
  },
}));

vi.mock('@/stores/provider-store', () => {
  type ProviderStoreLike = {
    providers: ReturnType<typeof makeProvider>[];
    loaded: boolean;
    seeding: boolean;
    load: typeof loadProviders;
    addModelToProvider: typeof addModelToProvider;
    removeModelFromProvider: typeof removeModelFromProvider;
    refreshModelCatalog: typeof refreshModelCatalog;
    refreshingCatalog: boolean;
  };
  return {
    useProviderStore: (selector: (state: ProviderStoreLike) => unknown) =>
      selector({
        providers: mockProviders.value,
        loaded: providerStoreState.loaded,
        seeding: providerStoreState.seeding,
        load: loadProviders,
        addModelToProvider,
        removeModelFromProvider,
        refreshModelCatalog,
        refreshingCatalog: providerStoreState.refreshingCatalog,
      }),
  };
});

vi.mock('@/stores/model-catalog-store', () => {
  type CatalogLike = {
    models: Record<string, ProviderModel[]>;
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
    load: typeof loadCatalog;
    getModelsForProvider: (providerName: string) => ProviderModel[];
  };
  return {
    useModelCatalogStore: (selector: (s: CatalogLike) => unknown) =>
      selector({
        models: catalogState.models,
        status: catalogState.status,
        error: catalogState.error,
        load: loadCatalog,
        getModelsForProvider: (providerName) =>
          catalogState.models[providerName] ?? [],
      }),
  };
});

function renderMarket() {
  const onClose = vi.fn();
  const onEditProvider = vi.fn();
  render(<ModelMarket onClose={onClose} onEditProvider={onEditProvider} />);
  return { onClose, onEditProvider };
}

describe('ModelMarket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    providerStoreState.loaded = true;
    providerStoreState.seeding = false;
    providerStoreState.refreshingCatalog = false;
    useUiStore.setState({ settingsModelsProviderId: null });
    catalogState.status = 'ready';
    catalogState.error = null;
    catalogState.models = {
      OpenAI: [
        makeModel({ id: 'gpt-4o', displayName: 'GPT-4o' }),
        makeModel({ id: 'gpt-5', displayName: 'GPT-5' }),
      ],
      Anthropic: [
        makeModel({ id: 'claude-3-5', displayName: 'Claude 3.5 Sonnet' }),
      ],
    };
    mockProviders.value = [
      makeProvider({
        id: 'b-openai',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4o', displayName: 'GPT-4o' })],
      }),
      makeProvider({
        id: 'b-anthropic',
        name: 'Anthropic',
        type: 'anthropic',
        isBuiltIn: true,
        models: [],
      }),
      makeProvider({
        id: 'c-custom',
        name: 'My API',
        isBuiltIn: false,
        models: [makeModel({ id: 'gemma', displayName: 'Gemma' })],
      }),
    ];
  });

  it('shows built-in catalogue with picked/unpicked toggles and adds/removes models', async () => {
    renderMarket();

    // GPT-4o is already added.
    expect(
      screen.getByRole('button', { name: /remove gpt-4o/i }),
    ).toHaveTextContent(/added/i);
    // GPT-5 is not yet added.
    const addGpt5 = screen.getByRole('button', { name: /add gpt-5/i });
    fireEvent.click(addGpt5);

    await waitFor(() => {
      expect(addModelToProvider).toHaveBeenCalledWith(
        'b-openai',
        expect.objectContaining({ id: 'gpt-5' }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /remove gpt-4o/i }));
    await waitFor(() => {
      expect(removeModelFromProvider).toHaveBeenCalledWith(
        'b-openai',
        'gpt-4o',
      );
    });
  });

  it('filters by search across providers', () => {
    renderMarket();

    fireEvent.change(screen.getByLabelText('Search models'), {
      target: { value: 'claude' },
    });

    expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument();
    expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument();
  });

  it('filters by provider chip', () => {
    renderMarket();

    fireEvent.click(screen.getByRole('button', { name: 'Anthropic' }));

    expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument();
    expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument();
  });

  it('triggers refresh action', async () => {
    renderMarket();

    fireEvent.click(screen.getByRole('button', { name: /refresh catalogue/i }));
    await waitFor(() => {
      expect(refreshModelCatalog).toHaveBeenCalledTimes(1);
    });
  });

  it('renders custom provider models with edit affordance', () => {
    const { onEditProvider } = renderMarket();

    // Custom provider has a "Custom" badge and shows its picked models inline.
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Gemma')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit provider/i }));
    expect(onEditProvider).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c-custom' }),
    );
  });

  it('lazy-loads the catalogue when status is idle', () => {
    catalogState.status = 'idle';
    catalogState.models = {};
    renderMarket();
    expect(loadCatalog).toHaveBeenCalled();
  });

  it('shows a loading state until providers are ready', () => {
    providerStoreState.loaded = false;
    renderMarket();
    expect(screen.getByText(/loading providers/i)).toBeInTheDocument();
    expect(loadProviders).toHaveBeenCalled();
  });

  it('does not render reset picks controls', () => {
    renderMarket();

    expect(
      screen.queryByRole('button', { name: /reset picks/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Reset all model picks?'),
    ).not.toBeInTheDocument();
  });
});
