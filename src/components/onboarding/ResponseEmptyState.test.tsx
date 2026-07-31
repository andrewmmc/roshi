import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseEmptyState } from './ResponseEmptyState';
import { makeProvider } from '@/__tests__/fixtures';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';

describe('ResponseEmptyState', () => {
  beforeEach(() => {
    useUiStore.setState(useUiStore.getInitialState(), true);
    useProviderStore.setState({
      providers: [
        makeProvider({ id: 'openai', apiKey: '', models: [], isBuiltIn: true }),
      ],
      selectedProviderId: 'openai',
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
  });

  it('opens the selected provider API-key field directly', async () => {
    const user = userEvent.setup();
    render(<ResponseEmptyState />);

    await user.click(screen.getByRole('button', { name: 'Add API key' }));

    expect(useUiStore.getState()).toMatchObject({
      settingsPage: 'providers',
      settingsProviderId: 'openai',
      settingsProviderFocusApiKey: true,
    });
  });
});
