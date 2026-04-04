import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowOnRender() {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  const originalError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('renders fallback UI when a child throws', () => {
    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(ThrowOnRender),
      ),
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('uses the panel layout when rendered inside a panel', () => {
    const { container } = render(
      React.createElement(
        ErrorBoundary,
        { panel: true },
        React.createElement(ThrowOnRender),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(container.firstChild).toHaveClass('h-full');
  });
});
