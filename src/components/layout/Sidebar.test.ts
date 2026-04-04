import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { emit } from '@tauri-apps/api/event';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useThemeStore } from '@/stores/theme-store';

vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(),
}));

vi.mock('@/components/providers/ProviderManager', () => ({
  ProviderManager: () =>
    React.createElement('div', null, 'ProviderManager Mock'),
}));

vi.mock('@/components/history/HistoryList', () => ({
  HistoryList: () => React.createElement('div', null, 'HistoryList Mock'),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    useComposerStore.getState().resetComposer();
    useResponseStore.getState().resetResponse();
    useThemeStore.setState({ theme: 'light' });
    vi.mocked(emit).mockReset();
  });

  it('emits the about event and toggles the theme', () => {
    render(React.createElement(Sidebar));

    fireEvent.click(screen.getByRole('button', { name: 'Roshi' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to dark mode' }),
    );

    expect(emit).toHaveBeenCalledWith('show-about');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('resets immediately when there are no unsaved changes', () => {
    useComposerStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'draft' }],
    });
    useResponseStore.setState({
      sentRequest: {
        messages: [{ role: 'user', content: 'draft' }],
        model: 'gpt-4',
        stream: true,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
      },
      error: 'oops',
    });

    render(React.createElement(Sidebar));

    fireEvent.click(screen.getByRole('button', { name: 'New request' }));

    expect(useComposerStore.getState().messages[0].content).toBe('');
    expect(useResponseStore.getState().error).toBeNull();
  });

  it('opens the discard dialog when there are unsaved changes', () => {
    useComposerStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'draft' }],
    });

    render(React.createElement(Sidebar));

    fireEvent.click(screen.getByRole('button', { name: 'New request' }));

    expect(screen.getByText('Discard unsent changes?')).toBeInTheDocument();
  });
});
