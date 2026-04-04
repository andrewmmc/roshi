import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CopyButton } from './copy-button';

describe('CopyButton', () => {
  it('is disabled when text is empty', () => {
    render(React.createElement(CopyButton, { text: '' }));
    expect(
      screen.getByRole('button', { name: /copy to clipboard/i }),
    ).toBeDisabled();
  });

  it('copies text and resets copied state after timeout', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(React.createElement(CopyButton, { text: 'Copied value' }));

    const button = screen.getByRole('button', { name: /copy to clipboard/i });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith('Copied value');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(
      screen.getByRole('button', { name: /copy to clipboard/i }),
    ).toBeInTheDocument();

    vi.useRealTimers();
  });
});
