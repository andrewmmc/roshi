import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResponsePanel } from './ResponsePanel';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { makeProvider } from '@/__tests__/fixtures';

vi.mock('./ChatView', () => ({
  ChatView: () => React.createElement('div', null, 'ChatView Mock'),
}));

vi.mock('./RawJsonView', () => ({
  RawJsonView: () => React.createElement('div', null, 'RawJsonView Mock'),
}));

vi.mock('./HeadersView', () => ({
  HeadersView: () => React.createElement('div', null, 'HeadersView Mock'),
}));

vi.mock('./CodeView', () => ({
  CodeView: () => React.createElement('div', null, 'CodeView Mock'),
}));

describe('ResponsePanel', () => {
  beforeEach(() => {
    useResponseStore.getState().resetResponse();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
  });

  it('shows empty states when there is no response content', () => {
    render(React.createElement(ResponsePanel));

    expect(
      screen.getByText('Send a request to see the response'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Body' }));
    expect(
      screen.getByText('Send a request to see raw JSON'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Headers' }));
    expect(
      screen.getByText('Send a request to see headers'),
    ).toBeInTheDocument();
  });

  it('shows loading status text while sending', () => {
    useResponseStore.setState({ isLoading: true });

    render(React.createElement(ResponsePanel));

    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sending request...');
  });

  it('renders response metadata and enables the code tab for supported providers', async () => {
    useProviderStore.setState({
      providers: [makeProvider({ id: 'p1', type: 'anthropic' })],
      selectedProviderId: 'p1',
    });
    useResponseStore.setState({
      response: {
        id: 'resp_1',
        model: 'claude',
        content: 'Hello',
        role: 'assistant',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      },
      statusCode: 200,
      durationMs: 321,
    });

    render(React.createElement(ResponsePanel));

    expect(await screen.findByText('ChatView Mock')).toBeInTheDocument();
    expect(screen.getByText('15 tokens')).toBeInTheDocument();
    expect(screen.getByText('200 Success')).toBeInTheDocument();
    expect(screen.getByText('321ms')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Code' })).toBeEnabled();
  });
});
