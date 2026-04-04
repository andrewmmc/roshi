import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MessageEditor } from './MessageEditor';
import { useComposerStore } from '@/stores/composer-store';

vi.mock('@/components/ui/select', () => {
  function Select({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
        {children}
      </select>
    );
  }

  return {
    Select,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => <option value={value}>{children}</option>,
    SelectValue: ({ children }: { children?: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

describe('MessageEditor', () => {
  beforeEach(() => {
    useComposerStore.getState().resetComposer();
    Element.prototype.scrollIntoView = vi.fn();
    HTMLElement.prototype.focus = vi.fn();
  });

  it('adds a new message with alternating role', () => {
    render(<MessageEditor />);

    fireEvent.click(screen.getByRole('button', { name: /add message/i }));

    expect(useComposerStore.getState().messages).toHaveLength(2);
    expect(useComposerStore.getState().messages[1].role).toBe('assistant');
  });

  it('updates message content and role', () => {
    render(<MessageEditor />);

    fireEvent.change(screen.getByPlaceholderText('User message...'), {
      target: { value: 'Hello' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'assistant' },
    });

    expect(useComposerStore.getState().messages[0]).toEqual(
      expect.objectContaining({ role: 'assistant', content: 'Hello' }),
    );
  });

  it('attaches a URL to the message', () => {
    render(<MessageEditor />);

    fireEvent.click(screen.getByRole('button', { name: /attach url/i }));
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/image.png'),
      {
        target: { value: 'https://example.com/photo.png' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(useComposerStore.getState().messages[0].attachments).toEqual([
      expect.objectContaining({
        filename: 'photo.png',
        mimeType: 'image/png',
        data: 'https://example.com/photo.png',
      }),
    ]);
  });

  it('clears a message after confirmation', () => {
    useComposerStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
    });

    render(<MessageEditor />);

    fireEvent.click(screen.getByRole('button', { name: /clear message/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(useComposerStore.getState().messages[0].content).toBe('');
  });

  it('deletes a message immediately when it is empty', () => {
    useComposerStore.setState({
      messages: [
        { id: 'm1', role: 'user', content: '' },
        { id: 'm2', role: 'assistant', content: '' },
      ],
    });

    render(<MessageEditor />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /delete message/i })[1],
    );

    expect(useComposerStore.getState().messages).toHaveLength(1);
  });
});
