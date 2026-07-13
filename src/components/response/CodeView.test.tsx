import { act, fireEvent, render, screen } from '@testing-library/react';
import { CodeView } from './CodeView';
import { useComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { makeModel, makeProvider } from '@/__tests__/fixtures';

const generateNode = vi.fn();
const generatePython = vi.fn();

vi.mock('@/services/codegen', () => ({
  getCodeGenerators: vi.fn((provider) => {
    if (provider?.name === 'NoCode') return [];
    return [
      { label: 'Node', generate: generateNode },
      { label: 'Python', generate: generatePython },
    ];
  }),
}));

describe('CodeView', () => {
  beforeEach(() => {
    useComposerStore.getState().resetComposer();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
    generateNode.mockReset();
    generatePython.mockReset();
    generateNode.mockReturnValue('node code');
    generatePython.mockReturnValue('python code');
  });

  function seedValidState() {
    useProviderStore.setState({
      providers: [
        makeProvider({ id: 'p1', models: [makeModel({ id: 'm1' })] }),
      ],
      selectedProviderId: 'p1',
      selectedModelId: 'm1',
    });
    useComposerStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
      stream: true,
    });
  }

  it('prompts for provider and model when they are missing', () => {
    render(<CodeView />);

    expect(
      screen.getByText('Select a provider and model to see code'),
    ).toBeInTheDocument();
  });

  it('shows unavailable state when the provider has no generators', () => {
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'p1',
          name: 'NoCode',
          models: [makeModel({ id: 'm1' })],
        }),
      ],
      selectedProviderId: 'p1',
      selectedModelId: 'm1',
    });
    useComposerStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
    });

    render(<CodeView />);

    expect(
      screen.getByText(
        'Code generation is not available for this provider type',
      ),
    ).toBeInTheDocument();
  });

  it('prompts for a message when the composer is empty', () => {
    useProviderStore.setState({
      providers: [
        makeProvider({ id: 'p1', models: [makeModel({ id: 'm1' })] }),
      ],
      selectedProviderId: 'p1',
      selectedModelId: 'm1',
    });

    render(<CodeView />);

    expect(screen.getByText('Enter a message to see code')).toBeInTheDocument();
  });

  it('renders generated code and toggles stream mode', () => {
    seedValidState();

    render(<CodeView />);

    expect(screen.getByText('node code')).toBeInTheDocument();
    expect(generateNode).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ stream: true }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'stream' }));

    expect(screen.getByRole('button', { name: 'sync' })).toBeInTheDocument();
    expect(generateNode).toHaveBeenLastCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ stream: false }),
      }),
    );
  });

  it('does not regenerate while hidden and refreshes on activation after inputs change', () => {
    seedValidState();

    const { rerender } = render(<CodeView isActive />);

    expect(generateNode).toHaveBeenCalledTimes(1);

    rerender(<CodeView isActive={false} />);
    act(() => {
      useComposerStore.setState({
        messages: [{ id: 'm1', role: 'user', content: 'Updated prompt' }],
      });
    });

    expect(generateNode).toHaveBeenCalledTimes(1);

    rerender(<CodeView isActive />);

    expect(generateNode).toHaveBeenCalledTimes(2);
    expect(generateNode).toHaveBeenLastCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          messages: [expect.objectContaining({ content: 'Updated prompt' })],
        }),
      }),
    );
  });

  it('reuses cached code when reactivated without input changes', () => {
    seedValidState();

    const { rerender } = render(<CodeView isActive />);

    expect(generateNode).toHaveBeenCalledTimes(1);

    rerender(<CodeView isActive={false} />);
    rerender(<CodeView isActive />);

    expect(generateNode).toHaveBeenCalledTimes(1);
  });
});
