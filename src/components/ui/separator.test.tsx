import { render } from '@testing-library/react';
import { Separator } from './separator';

vi.mock('@base-ui/react/separator', () => ({
  Separator: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { orientation?: string }) => (
    <div {...props}>{children}</div>
  ),
}));

describe('Separator', () => {
  it('renders with vertical orientation and custom classes', () => {
    const { container } = render(
      <Separator orientation="vertical" className="custom-separator" />,
    );

    expect(container.firstChild).toHaveAttribute('orientation', 'vertical');
    expect(container.firstChild).toHaveClass('custom-separator');
  });
});
