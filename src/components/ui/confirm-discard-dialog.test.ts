import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDiscardDialog } from './confirm-discard-dialog';

describe('ConfirmDiscardDialog', () => {
  it('closes the dialog when cancel is clicked', () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      React.createElement(ConfirmDiscardDialog, {
        open: true,
        onOpenChange,
        onConfirm,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms discard and then closes the dialog', () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      React.createElement(ConfirmDiscardDialog, {
        open: true,
        onOpenChange,
        onConfirm,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
