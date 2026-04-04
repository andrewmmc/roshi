import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

vi.mock('@base-ui/react/merge-props', () => ({
  mergeProps: (...propsList: Array<Record<string, unknown>>) =>
    Object.assign({}, ...propsList),
}));

vi.mock('@base-ui/react/use-render', () => ({
  useRender: ({
    defaultTagName,
    props,
  }: {
    defaultTagName: keyof JSX.IntrinsicElements;
    props: Record<string, unknown>;
  }) => {
    const Tag = defaultTagName;
    return <Tag {...props} />;
  },
}));

describe('Badge', () => {
  it('renders with the requested variant classes', () => {
    render(<Badge variant="destructive">Danger</Badge>);

    expect(screen.getByText('Danger')).toHaveClass('text-destructive');
  });
});
