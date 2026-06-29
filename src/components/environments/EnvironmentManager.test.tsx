import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnvironmentSelector } from './EnvironmentManager';
import { useEnvironmentStore } from '@/stores/environment-store';
import { useUiStore } from '@/stores/ui-store';
import type { Environment } from '@/types/history';

vi.mock('@/components/ui/select', async () => {
  const mocks = await import('@/__tests__/mock-select');
  return mocks;
});

function makeEnvironment(overrides?: Partial<Environment>): Environment {
  return {
    id: 'env-1',
    name: 'Local',
    variables: [],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('EnvironmentSelector', () => {
  beforeEach(() => {
    useUiStore.setState(useUiStore.getInitialState(), true);
    useEnvironmentStore.setState({
      environments: [],
      selectedEnvironmentId: null,
      loaded: true,
      load: vi.fn().mockResolvedValue(undefined),
      selectEnvironment: vi.fn(),
    });
  });

  it('shows Manage environments without making No environment selectable', async () => {
    const user = userEvent.setup();

    render(<EnvironmentSelector />);

    const environmentSelect = screen.getByRole('combobox', {
      name: /select environment/i,
    });
    expect(
      screen.queryByRole('option', { name: /no environment/i }),
    ).not.toBeInTheDocument();

    await user.selectOptions(environmentSelect, '__manage_environments__');

    expect(useUiStore.getState().settingsOpen).toBe(true);
    expect(useUiStore.getState().settingsPage).toBe('environments');
  });

  it('selects an environment without opening settings', async () => {
    const user = userEvent.setup();
    const selectEnvironment = vi.fn();
    useEnvironmentStore.setState({
      environments: [makeEnvironment()],
      selectedEnvironmentId: null,
      selectEnvironment,
    });

    render(<EnvironmentSelector />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: /select environment/i }),
      'env-1',
    );

    expect(selectEnvironment).toHaveBeenCalledWith('env-1');
    expect(useUiStore.getState().settingsOpen).toBe(false);
  });
});
