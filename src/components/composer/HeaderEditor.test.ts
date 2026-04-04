import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HeaderEditor } from './HeaderEditor';
import { useComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { makeProvider } from '@/__tests__/fixtures';

describe('HeaderEditor', () => {
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

  it('renders preset provider headers with masked auth values', () => {
    useProviderStore.setState({
      providers: [
        makeProvider({
          id: 'p1',
          apiKey: 'secret-key-1234',
          customHeaders: { 'X-Team': 'core' },
        }),
      ],
      selectedProviderId: 'p1',
    });

    render(React.createElement(HeaderEditor));

    expect(screen.getByText('From provider')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Authorization')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bearer secr••••••••')).toBeInTheDocument();
    expect(screen.getByDisplayValue('X-Team')).toBeInTheDocument();
    expect(screen.getByDisplayValue('core')).toBeInTheDocument();
  });

  it('adds, edits, and removes custom headers through the composer store', () => {
    render(React.createElement(HeaderEditor));

    fireEvent.click(screen.getByRole('button', { name: /add header/i }));

    const nameInputs = screen.getAllByPlaceholderText('Header name');
    const valueInputs = screen.getAllByPlaceholderText('Header value');
    fireEvent.change(nameInputs[1], { target: { value: 'X-Test' } });
    fireEvent.change(valueInputs[1], { target: { value: 'value' } });

    expect(useComposerStore.getState().customHeaders[1]).toEqual(
      expect.objectContaining({ key: 'X-Test', value: 'value' }),
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Remove header' })[1],
    );

    expect(useComposerStore.getState().customHeaders).toHaveLength(1);
  });

  it('disables removing the final remaining header row', () => {
    render(React.createElement(HeaderEditor));

    expect(
      screen.getByRole('button', { name: 'Remove header' }),
    ).toBeDisabled();
  });
});
