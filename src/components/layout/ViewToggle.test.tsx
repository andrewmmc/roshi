import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewToggle } from './ViewToggle';
import { useUiStore } from '@/stores/ui-store';

const { loadEvalView } = vi.hoisted(() => ({
  loadEvalView: vi.fn(() =>
    Promise.resolve({ default: () => <div>EvalView Mock</div> }),
  ),
}));

vi.mock('./lazy-view-loaders', () => ({ loadEvalView }));

describe('ViewToggle', () => {
  beforeEach(() => {
    loadEvalView.mockClear();
    loadEvalView.mockImplementation(() =>
      Promise.resolve({ default: () => <div>EvalView Mock</div> }),
    );
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

  it('keeps the current view visible until the eval view is loaded', async () => {
    let finishLoading:
      ((value: { default: () => React.JSX.Element }) => void) | undefined;
    const loading = new Promise<{ default: () => React.JSX.Element }>(
      (resolve) => {
        finishLoading = resolve;
      },
    );
    loadEvalView.mockImplementation(() => loading);
    const user = userEvent.setup();
    render(<ViewToggle />);

    await user.click(screen.getByRole('button', { name: /eval/i }));

    expect(useUiStore.getState().mainView).toBe('request');
    expect(screen.getByRole('button', { name: /eval/i })).toHaveAttribute(
      'aria-busy',
      'true',
    );

    finishLoading?.({ default: () => <div>EvalView Mock</div> });

    await waitFor(() => expect(useUiStore.getState().mainView).toBe('eval'));
  });
});
