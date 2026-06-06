import { render, screen } from '@testing-library/react';
import { RunnerPicker } from './RunnerPicker';
import { makeModel, makeProvider } from '@/__tests__/fixtures';

vi.mock('@/stores/eval-store', () => ({
  useEvalStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      runners: [],
      addRunner: vi.fn(),
      removeRunner: vi.fn(),
      isRunning: false,
    }),
}));

vi.mock('@/stores/provider-store', () => ({
  useProviderStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      providers: [
        makeProvider({
          id: 'openai',
          name: 'OpenAI',
          isBuiltIn: true,
          models: [makeModel({ id: 'gpt-4o', displayName: 'GPT-4o' })],
        }),
      ],
    }),
}));

describe('RunnerPicker', () => {
  it('shows the selected provider name in the trigger', () => {
    render(<RunnerPicker />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });
});
