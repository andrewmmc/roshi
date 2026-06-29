import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewToggle } from './ViewToggle';
import { useUiStore } from '@/stores/ui-store';

describe('ViewToggle', () => {
  beforeEach(() => {
    useUiStore.setState({ mainView: 'request' });
  });

  it('renders both view options as buttons', () => {
    render(<ViewToggle />);
    expect(
      screen.getByRole('button', { name: /request/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eval/i })).toBeInTheDocument();
  });

  it('marks the active view with aria-pressed', () => {
    render(<ViewToggle />);
    expect(screen.getByRole('button', { name: /request/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /eval/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('switches view when an option is clicked', async () => {
    const user = userEvent.setup();
    render(<ViewToggle />);

    await user.click(screen.getByRole('button', { name: /eval/i }));

    expect(useUiStore.getState().mainView).toBe('eval');
    expect(screen.getByRole('button', { name: /eval/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /request/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
