import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RawJsonView } from './RawJsonView';
import { useResponseStore } from '@/stores/response-store';

describe('RawJsonView', () => {
  beforeEach(() => {
    useResponseStore.getState().resetResponse();
  });

  it('shows response JSON by default and switches to request JSON', () => {
    useResponseStore.setState({
      rawResponse: { id: 'resp_1', ok: true },
      rawRequest: { model: 'gpt-4o-mini' },
      requestUrl: 'https://api.example.com/v1/chat/completions',
    });

    render(React.createElement(RawJsonView));

    expect(screen.getByText(/"resp_1"/)).toBeInTheDocument();
    expect(screen.queryByText(/"gpt-4o-mini"/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));

    expect(screen.getByText(/POST/)).toBeInTheDocument();
    expect(
      screen.getByText('https://api.example.com/v1/chat/completions'),
    ).toBeInTheDocument();
    expect(screen.getByText(/"gpt-4o-mini"/)).toBeInTheDocument();
  });

  it('shows the empty state when no raw payloads are available', () => {
    render(React.createElement(RawJsonView));

    expect(screen.getByText('No response data available')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Request' }));
    expect(screen.getByText('No request data available')).toBeInTheDocument();
  });
});
