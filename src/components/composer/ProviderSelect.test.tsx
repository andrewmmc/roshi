import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProviderSelect } from './ProviderSelect';
import { useProviderStore } from '@/stores/provider-store';
import { makeModel, makeProvider } from '@/__tests__/fixtures';

vi.mock('@/components/ui/select', () => {
  function Select({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) {
    return (
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    );
  }

  function SelectTrigger({
    ariaLabel,
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { ariaLabel?: string }) {
    return (
      <div aria-label={ariaLabel} {...props}>
        {children}
      </div>
    );
  }

  return {
    Select,
    SelectTrigger,
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectItem: ({
      value,
      children,
      title,
    }: {
      value: string;
      children: React.ReactNode;
      title?: string;
    }) => (
      <option value={value} title={title}>
        {children}
      </option>
    ),
    SelectValue: ({ children }: { children?: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

describe('ProviderSelect', () => {
  beforeEach(() => {
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

  it('renders providers and models and dispatches selections', () => {
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
    fireEvent.change(selects[0], { target: { value: 'p1' } });
    fireEvent.change(selects[1], { target: { value: 'm2' } });

    expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GPT-4o').length).toBeGreaterThan(0);
    expect(selectProvider).toHaveBeenCalledWith('p1');
    expect(selectModel).toHaveBeenCalledWith('m2');
  });

  it('disables model selection for google gemini and shows empty model text', () => {
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'g1',
          type: 'google-gemini',
          name: 'Gemini',
          models: [],
        }),
      ],
      selectedProviderId: 'g1',
      selectedModelId: null,
    });

    render(<ProviderSelect />);

    const selects = screen.getAllByRole('combobox');
    expect(selects[1]).toBeDisabled();
    expect(screen.getByText('No models available.')).toBeInTheDocument();
  });
});
