import { render, screen } from '@testing-library/react';
import { Slider } from './slider';

vi.mock('@base-ui/react/slider', () => ({
  Slider: {
    Root: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { value?: number[] }) => (
      <div data-testid="slider-root" {...props}>
        {children}
      </div>
    ),
    Control: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    Track: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    Indicator: (props: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props} />
    ),
    Thumb: (props: React.HTMLAttributes<HTMLDivElement>) => (
      <div data-testid="slider-thumb" {...props} />
    ),
  },
}));

describe('Slider', () => {
  it('renders thumbs from the controlled value', () => {
    render(<Slider value={[10, 90]} />);

    expect(screen.getAllByTestId('slider-thumb')).toHaveLength(2);
  });

  it('falls back to min and max when no value is provided', () => {
    render(<Slider min={1} max={3} />);

    expect(screen.getAllByTestId('slider-thumb')).toHaveLength(2);
  });
});
