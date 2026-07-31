import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirstRunChecklist } from './FirstRunChecklist';
import { makeProvider } from '@/__tests__/fixtures';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';

describe('FirstRunChecklist', () => {
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

  it('opens the selected provider and focuses its API-key field', async () => {
    const user = userEvent.setup();
    render(<FirstRunChecklist />);

    await user.click(screen.getByRole('button', { name: 'Add API key' }));

    expect(useUiStore.getState()).toMatchObject({
      settingsOpen: true,
      settingsPage: 'providers',
      settingsProviderId: 'openai',
      settingsProviderFocusApiKey: true,
    });
  });

  it('opens models filtered to the selected provider', async () => {
    const user = userEvent.setup();
    render(<FirstRunChecklist />);

    await user.click(screen.getByRole('button', { name: 'Browse Models' }));

    expect(useUiStore.getState()).toMatchObject({
      settingsOpen: true,
      settingsPage: 'models',
      settingsModelsProviderId: 'openai',
    });
  });
});
