import { render, screen } from '@testing-library/react';
import { JsonHighlight } from './json-highlight';
import { JSON_HIGHLIGHT_MAX_CHARS } from '@/utils/json-highlight';

describe('JsonHighlight', () => {
  it('keeps syntax highlighting for small payloads', () => {
    const { container } = render(
      <JsonHighlight json={'{\n  "message": "hello"\n}'} />,
    );

    expect(
      screen.queryByText('Syntax highlighting disabled for large payload'),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll('span')).not.toHaveLength(0);
  });

  it('falls back to plain text for large payloads', () => {
    const largeJson = `"${'x'.repeat(JSON_HIGHLIGHT_MAX_CHARS + 1)}"`;
    const { container } = render(<JsonHighlight json={largeJson} />);

    expect(
      screen.getByText('Syntax highlighting disabled for large payload'),
    ).toBeInTheDocument();
    expect(container.querySelector('pre')).toHaveClass('whitespace-pre');
    expect(container.querySelectorAll('span')).toHaveLength(0);
    expect(screen.getByText(largeJson)).toBeInTheDocument();
  });
});
