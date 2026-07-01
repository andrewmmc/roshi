import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EvalMessagesEditor } from './EvalComposer';
import { useEvalStore } from '@/stores/eval-store';

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

describe('EvalMessagesEditor', () => {
  beforeEach(() => {
    useEvalStore.getState().reset();
  });

  it('adds a new message with alternating role', () => {
    render(<EvalMessagesEditor />);

    fireEvent.click(screen.getByRole('button', { name: /add message/i }));

    expect(useEvalStore.getState().composer.messages).toHaveLength(2);
    expect(useEvalStore.getState().composer.messages[1].role).toBe('assistant');
  });

  it('only offers User and Assistant roles (no redundant System role)', () => {
    render(<EvalMessagesEditor />);

    const options =
      screen.getByRole('combobox').querySelectorAll('option') ?? [];
    const labels = Array.from(options).map((o) => o.textContent);
    expect(labels).toEqual(['User', 'Assistant']);
  });

  it('deletes an empty message immediately, without confirmation', () => {
    useEvalStore.setState((s) => ({
      composer: {
        ...s.composer,
        messages: [
          { id: 'm1', role: 'user', content: '' },
          { id: 'm2', role: 'assistant', content: '' },
        ],
      },
    }));

    render(<EvalMessagesEditor />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /delete message/i })[1],
    );

    expect(useEvalStore.getState().composer.messages).toHaveLength(1);
  });

  it('confirms before deleting a message with content', () => {
    useEvalStore.setState((s) => ({
      composer: {
        ...s.composer,
        messages: [
          { id: 'm1', role: 'user', content: 'Hello' },
          { id: 'm2', role: 'assistant', content: '' },
        ],
      },
    }));

    render(<EvalMessagesEditor />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /delete message/i })[0],
    );
    // Message still present until the dialog is confirmed.
    expect(useEvalStore.getState().composer.messages).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(useEvalStore.getState().composer.messages).toHaveLength(1);
    expect(useEvalStore.getState().composer.messages[0].id).toBe('m2');
  });

  it('attaches a URL to a message', () => {
    render(<EvalMessagesEditor />);

    fireEvent.click(screen.getByRole('button', { name: /attach url/i }));
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/image.png'),
      { target: { value: 'https://example.com/photo.png' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(useEvalStore.getState().composer.messages[0].attachments).toEqual([
      expect.objectContaining({
        filename: 'photo.png',
        mimeType: 'image/png',
        data: 'https://example.com/photo.png',
      }),
    ]);
  });

  it('removes attachments from chips', () => {
    useEvalStore.setState((s) => ({
      composer: {
        ...s.composer,
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: '',
            attachments: [
              {
                id: 'a1',
                filename: 'photo.png',
                mimeType: 'image/png',
                data: 'x',
              },
            ],
          },
        ],
      },
    }));

    render(<EvalMessagesEditor />);

    fireEvent.click(screen.getByRole('button', { name: /remove photo.png/i }));

    expect(useEvalStore.getState().composer.messages[0].attachments).toEqual(
      [],
    );
  });
});
