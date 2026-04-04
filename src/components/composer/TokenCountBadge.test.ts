import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TokenCountBadge } from './TokenCountBadge';
import { useTokenCount } from '@/hooks/use-token-count';

vi.mock('@/hooks/use-token-count', () => ({
  useTokenCount: vi.fn(),
}));

describe('TokenCountBadge', () => {
  it('does not render when there is no estimated token count', () => {
    vi.mocked(useTokenCount).mockReturnValue(null);

    const { container, rerender } = render(
      React.createElement(TokenCountBadge),
    );
    expect(container).toBeEmptyDOMElement();

    vi.mocked(useTokenCount).mockReturnValue(0);
    rerender(React.createElement(TokenCountBadge));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the formatted count and tooltip details', async () => {
    vi.mocked(useTokenCount).mockReturnValue(1234);

    render(React.createElement(TokenCountBadge));

    const trigger = screen.getByText('~1.2k tokens');
    fireEvent.mouseEnter(trigger);

    expect(
      await screen.findByText('Estimated prompt tokens: 1,234'),
    ).toBeVisible();
  });
});
