import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RequestComposer } from './RequestComposer';
import { useComposerStore } from '@/stores/composer-store';

vi.mock('./MessageEditor', () => ({
  MessageEditor: () => React.createElement('div', null, 'MessageEditor Mock'),
}));

vi.mock('./HeaderEditor', () => ({
  HeaderEditor: () => React.createElement('div', null, 'HeaderEditor Mock'),
}));

vi.mock('./ParameterControls', () => ({
  ParameterControls: () =>
    React.createElement('div', null, 'ParameterControls Mock'),
}));

describe('RequestComposer', () => {
  beforeEach(() => {
    useComposerStore.getState().resetComposer();
  });

  it('shows indicator dots for system prompt and custom headers', () => {
    useComposerStore.setState({
      systemPrompt: 'Be concise',
      customHeaders: [{ id: 'h1', key: 'X-Test', value: '1' }],
    });

    const { container } = render(React.createElement(RequestComposer));

    expect(
      screen.getByRole('tab', { name: /system prompt/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /headers/i })).toBeInTheDocument();
    expect(container.querySelectorAll('.bg-primary')).toHaveLength(2);
  });

  it('updates the system prompt through the textarea', () => {
    render(React.createElement(RequestComposer));

    fireEvent.click(screen.getByRole('tab', { name: /system prompt/i }));
    fireEvent.change(screen.getByPlaceholderText('System prompt (optional)'), {
      target: { value: 'You are a helpful assistant.' },
    });

    expect(useComposerStore.getState().systemPrompt).toBe(
      'You are a helpful assistant.',
    );
  });

  it('renders the child editors inside their tabs', () => {
    render(React.createElement(RequestComposer));

    expect(screen.getByText('MessageEditor Mock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /headers/i }));
    expect(screen.getByText('HeaderEditor Mock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /parameters/i }));
    expect(screen.getByText('ParameterControls Mock')).toBeInTheDocument();
  });
});
