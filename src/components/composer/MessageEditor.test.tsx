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

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('cancels URL entry with Escape and cancel button', () => {
    render(<MessageEditor />);

    fireEvent.click(screen.getByRole('button', { name: /attach url/i }));
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/image.png'),
      {
        target: { value: 'https://example.com/photo.png' },
      },
    );
    fireEvent.keyDown(
      screen.getByPlaceholderText('https://example.com/image.png'),
      {
        key: 'Escape',
      },
    );

    expect(
      screen.queryByPlaceholderText('https://example.com/image.png'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /attach url/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(useComposerStore.getState().messages[0].attachments).toBeUndefined();
  });

  it('attaches a URL with Enter and falls back to file filename', () => {
    render(<MessageEditor />);

    fireEvent.click(screen.getByRole('button', { name: /attach url/i }));
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/image.png'),
      {
        target: { value: 'https://example.com/download?x=1' },
      },
    );
    fireEvent.keyDown(
      screen.getByPlaceholderText('https://example.com/image.png'),
      {
        key: 'Enter',
      },
    );

    expect(useComposerStore.getState().messages[0].attachments).toEqual([
      expect.objectContaining({ filename: 'download' }),
    ]);
  });

  it('ignores blank URL submissions', () => {
    render(<MessageEditor />);

    fireEvent.click(screen.getByRole('button', { name: /attach url/i }));
    fireEvent.keyDown(
      screen.getByPlaceholderText('https://example.com/image.png'),
      {
        key: 'Enter',
      },
    );

    expect(useComposerStore.getState().messages[0].attachments).toBeUndefined();
  });

  it('attaches a selected file and clears the input', () => {
    const readAsDataURL = vi.fn(function (this: FileReader) {
      Object.defineProperty(this, 'result', {
        configurable: true,
        value: 'data:text/plain;base64,aGVsbG8=',
      });
      this.onload?.({} as ProgressEvent<FileReader>);
    });
    vi.stubGlobal(
      'FileReader',
      vi.fn(function () {
        return { readAsDataURL };
      }) as unknown as typeof FileReader,
    );

    const { container } = render(<MessageEditor />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(readAsDataURL).toHaveBeenCalledWith(file);
    expect(useComposerStore.getState().messages[0].attachments).toEqual([
      expect.objectContaining({
        filename: 'hello.txt',
        mimeType: 'text/plain',
        data: 'data:text/plain;base64,aGVsbG8=',
      }),
    ]);
    expect(input.value).toBe('');
  });

  it('uses guessed MIME type when selected files do not provide one', () => {
    const readAsDataURL = vi.fn(function (this: FileReader) {
      Object.defineProperty(this, 'result', {
        configurable: true,
        value: 'data:application/pdf;base64,aaa=',
      });
      this.onload?.({} as ProgressEvent<FileReader>);
    });
    vi.stubGlobal(
      'FileReader',
      vi.fn(function () {
        return { readAsDataURL };
      }) as unknown as typeof FileReader,
    );

    const { container } = render(<MessageEditor />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['pdf'], 'doc.pdf', { type: '' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(
      useComposerStore.getState().messages[0].attachments?.[0].mimeType,
    ).toBe('application/pdf');
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

  it('cancels clear confirmation without changing the message', () => {
    useComposerStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
    });

    render(<MessageEditor />);

    fireEvent.click(screen.getByRole('button', { name: /clear message/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(useComposerStore.getState().messages[0].content).toBe('Hello');
  });

  it('deletes a message with content after confirmation', () => {
    useComposerStore.setState({
      messages: [
        { id: 'm1', role: 'user', content: 'Hello' },
        { id: 'm2', role: 'assistant', content: '' },
      ],
    });

    render(<MessageEditor />);

    fireEvent.click(
      screen.getAllByRole('button', { name: /delete message/i })[0],
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(useComposerStore.getState().messages).toHaveLength(1);
    expect(useComposerStore.getState().messages[0].id).toBe('m2');
  });

  it('removes attachments from chips', () => {
    useComposerStore.setState({
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
    });

    render(<MessageEditor />);

    fireEvent.click(screen.getByRole('button', { name: /remove photo.png/i }));

    expect(useComposerStore.getState().messages[0].attachments).toEqual([]);
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
