import { fireEvent, render, screen } from '@testing-library/react';
import { ParameterControls } from './ParameterControls';
import { useComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { makeModel, makeProvider } from '@/__tests__/fixtures';

describe('ParameterControls', () => {
  beforeEach(() => {
    useComposerStore.getState().resetComposer();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
  });

  it('disables unsupported controls for anthropic providers', () => {
    useProviderStore.setState({
      providers: [makeProvider({ id: 'a1', type: 'anthropic' })],
      selectedProviderId: 'a1',
    });

    render(<ParameterControls />);

    expect(screen.getByLabelText('Top K')).toBeEnabled();
    expect(screen.getByLabelText('Frequency Penalty')).toBeDisabled();
    expect(screen.getByLabelText('Presence Penalty')).toBeDisabled();
    expect(screen.getByLabelText('Thinking')).toBeEnabled();
  });

  it('uses model capabilities to disable unsupported GPT-5 controls', () => {
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'o1',
          models: [makeModel({ id: 'gpt-5.5' })],
        }),
      ],
      selectedProviderId: 'o1',
      selectedModelId: 'gpt-5.5',
    });

    render(<ParameterControls />);

    expect(screen.getByLabelText('Temperature')).toBeDisabled();
    expect(screen.getByLabelText('Top P')).toBeDisabled();
    expect(screen.getByLabelText('Frequency Penalty')).toBeDisabled();
    expect(screen.getByLabelText('Presence Penalty')).toBeDisabled();
    expect(screen.getByLabelText('Max Tokens')).toBeEnabled();
    expect(screen.getByLabelText('Stream')).toBeEnabled();
    expect(screen.getByLabelText('Thinking')).toBeDisabled();
  });

  it('disables streaming when selected model capabilities do not support it', () => {
    useComposerStore.setState({ stream: true });
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'o1',
          models: [makeModel({ id: 'gpt-5.5-pro' })],
        }),
      ],
      selectedProviderId: 'o1',
      selectedModelId: 'gpt-5.5-pro',
    });

    render(<ParameterControls />);

    expect(screen.getByLabelText('Stream')).toBeDisabled();
    expect(screen.getByLabelText('Stream')).not.toBeChecked();
  });

  it('shows and clamps thinking budget when supported', () => {
    useProviderStore.setState({
      providers: [makeProvider({ id: 'g1', type: 'google-gemini' })],
      selectedProviderId: 'g1',
    });

    render(<ParameterControls />);

    fireEvent.click(screen.getByLabelText('Thinking'));
    const budgetInput = screen.getByLabelText('Budget Tokens');
    fireEvent.change(budgetInput, { target: { value: '500' } });

    expect(useComposerStore.getState().thinkingEnabled).toBe(true);
    expect(useComposerStore.getState().thinkingBudgetTokens).toBe(1024);
  });

  it('hides budget tokens for adaptive-only thinking models', () => {
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'a1',
          type: 'anthropic',
          models: [makeModel({ id: 'claude-opus-4-8' })],
        }),
      ],
      selectedProviderId: 'a1',
      selectedModelId: 'claude-opus-4-8',
    });

    render(<ParameterControls />);

    fireEvent.click(screen.getByLabelText('Thinking'));

    expect(screen.queryByLabelText('Budget Tokens')).not.toBeInTheDocument();
  });

  it('resets edited values back to defaults', () => {
    render(<ParameterControls />);

    fireEvent.change(screen.getByLabelText('Temperature'), {
      target: { value: '1.55' },
    });
    fireEvent.change(screen.getByLabelText('Max Tokens'), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByLabelText('Stream'));

    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

    const state = useComposerStore.getState();
    expect(state.temperature).toBe(1);
    expect(state.maxTokens).toBe(4096);
    expect(state.stream).toBe(true);
  });
});
