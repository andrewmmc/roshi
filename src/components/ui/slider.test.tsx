import { render, screen } from '@testing-library/react';
import { stripNonDomProps } from '@/__tests__/strip-dom-props';
import { Slider } from './slider';

vi.mock('@base-ui/react/slider', () => ({
  Slider: {
    Root: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { value?: number[] }) => (
      <div data-testid="slider-root" {...stripNonDomProps(props)}>
        {children}
      </div>
    ),
    Control: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...stripNonDomProps(props)}>{children}</div>
    ),
    Track: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...stripNonDomProps(props)}>{children}</div>
    ),
    Indicator: (props: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...stripNonDomProps(props)} />
    ),
    Thumb: (props: React.HTMLAttributes<HTMLDivElement>) => (
      <div data-testid="slider-thumb" {...stripNonDomProps(props)} />
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
