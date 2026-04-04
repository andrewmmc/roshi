import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MainPanel } from './MainPanel';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';

const send = vi.fn();
const cancel = vi.fn();

vi.mock('@/components/composer/RequestComposer', () => ({
  RequestComposer: () =>
    React.createElement('div', null, 'RequestComposer Mock'),
}));

vi.mock('@/components/response/ResponsePanel', () => ({
  ResponsePanel: () => React.createElement('div', null, 'ResponsePanel Mock'),
}));

vi.mock('@/components/composer/ProviderSelect', () => ({
  ProviderSelect: () => React.createElement('div', null, 'ProviderSelect Mock'),
}));

vi.mock('@/components/composer/TokenCountBadge', () => ({
  TokenCountBadge: () =>
    React.createElement('div', null, 'TokenCountBadge Mock'),
}));

vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  ResizablePanel: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  ResizableHandle: () => React.createElement('div'),
}));

vi.mock('@/hooks/use-send-request', () => ({
  useSendRequest: () => ({ send, cancel }),
}));

describe('MainPanel', () => {
  beforeEach(() => {
    send.mockReset();
    cancel.mockReset();
    useResponseStore.getState().resetResponse();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
  });

  it('disables sending when no providers exist', () => {
    render(React.createElement(MainPanel));

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('sends on button click and keyboard shortcut when a provider exists', () => {
    useProviderStore.setState({ providers: [{ id: 'p1' } as never] });

    const { container } = render(React.createElement(MainPanel));

    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    fireEvent.keyDown(container.firstChild as Element, {
      key: 'Enter',
      metaKey: true,
    });

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('shows the stop button while loading', () => {
    useProviderStore.setState({ providers: [{ id: 'p1' } as never] });
    useResponseStore.setState({ isLoading: true });

    render(React.createElement(MainPanel));

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
