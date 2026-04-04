import { fireEvent, render, screen } from '@testing-library/react';
import { HistoryItem } from './HistoryItem';
import { makeHistoryEntry } from '@/__tests__/fixtures';

describe('HistoryItem', () => {
  it('shows provider metadata, preview text, and duration', () => {
    render(
      <HistoryItem
        entry={makeHistoryEntry({
          providerName: 'OpenAI',
          modelId: 'gpt-4o',
          durationMs: 250,
        })}
        onSelect={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText(/250ms/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hello/i })).toBeInTheDocument();
  });

  it('uses an error style and fallback preview when there is no user message', () => {
    render(
      <HistoryItem
        entry={makeHistoryEntry({
          request: {
            ...makeHistoryEntry().request,
            messages: [{ role: 'assistant', content: 'done' }],
          },
          error: 'failed',
        })}
        onSelect={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(screen.getByText('No message')).toHaveClass('text-destructive');
  });

  it('calls delete without triggering select', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    const entry = makeHistoryEntry({ id: 'h1' });

    render(
      <HistoryItem entry={entry} onSelect={onSelect} onDelete={onDelete} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete history entry' }),
    );

    expect(onDelete).toHaveBeenCalledWith('h1');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
