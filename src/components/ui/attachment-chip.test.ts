import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AttachmentChip } from './attachment-chip';

describe('AttachmentChip', () => {
  it('renders file attachments and exposes the remove action when provided', () => {
    const onRemove = vi.fn();

    render(
      React.createElement(AttachmentChip, {
        attachment: {
          id: 'att_1',
          filename: 'notes.txt',
          mimeType: 'text/plain',
          size: 128,
          dataUrl: 'data:text/plain;base64,SGVsbG8=',
        },
        onRemove,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove notes.txt' }));

    expect(screen.getByText('notes.txt')).toBeInTheDocument();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders image attachments without a remove button when not removable', () => {
    render(
      React.createElement(AttachmentChip, {
        attachment: {
          id: 'att_2',
          filename: 'photo.png',
          mimeType: 'image/png',
          size: 256,
          dataUrl: 'data:image/png;base64,AAAA',
        },
      }),
    );

    expect(screen.getByText('photo.png')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Remove photo.png' }),
    ).not.toBeInTheDocument();
  });
});
