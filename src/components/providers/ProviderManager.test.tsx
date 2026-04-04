import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProviderManager } from './ProviderManager';
import { makeProvider } from '@/__tests__/fixtures';
import { useProviderStore } from '@/stores/provider-store';

const updateProvider = vi.fn();
const resetProvider = vi.fn();
const resetAllProviders = vi.fn();

vi.mock('@/hooks/use-providers', () => ({
  useProviders: () => ({
    providers: [
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
    ],
    updateProvider,
    resetProvider,
    resetAllProviders,
  }),
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

describe('ProviderManager', () => {
  beforeEach(() => {
    updateProvider.mockReset();
    resetProvider.mockReset();
    resetAllProviders.mockReset();
    useProviderStore.setState({
      providers: [
        makeProvider({ id: 'builtin-openai', name: 'OpenAI', isBuiltIn: true }),
      ],
    });
  });

  it('renders provider details in list view and resets all providers', async () => {
    render(<ProviderManager />);

    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(
      screen.getByText(/API key configured · Custom headers/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /reset all to default/i }),
    );
    expect(resetAllProviders).toHaveBeenCalledTimes(1);
  });

  it('switches to edit view and updates a provider through the form', async () => {
    render(<ProviderManager />);

    fireEvent.click(screen.getByRole('button', { name: /openai/i }));

    expect(screen.getByText('Edit Provider')).toBeInTheDocument();
    expect(screen.getByText('ProviderForm Mock OpenAI')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Mock' }));
    expect(updateProvider).toHaveBeenCalledWith(
      'builtin-openai',
      expect.objectContaining({ name: 'Updated Provider' }),
    );
  });

  it('resets a built-in provider in edit view', async () => {
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

    render(<ProviderManager />);

    fireEvent.click(screen.getByRole('button', { name: /openai/i }));
    fireEvent.click(screen.getByRole('button', { name: /reset to default/i }));

    expect(resetProvider).toHaveBeenCalledWith('builtin-openai');
  });
});
