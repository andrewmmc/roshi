import { fireEvent, render, screen } from '@testing-library/react';
import { ParameterControls } from './ParameterControls';
import { useComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { makeProvider } from '@/__tests__/fixtures';

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
