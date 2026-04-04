import { fireEvent, render, screen } from '@testing-library/react';
import { RequestComposer } from './RequestComposer';
import { useComposerStore } from '@/stores/composer-store';

vi.mock('./MessageEditor', () => ({
  MessageEditor: () => <div>MessageEditor Mock</div>,
}));

vi.mock('./HeaderEditor', () => ({
  HeaderEditor: () => <div>HeaderEditor Mock</div>,
}));

vi.mock('./ParameterControls', () => ({
  ParameterControls: () => <div>ParameterControls Mock</div>,
}));

describe('RequestComposer', () => {
  beforeEach(() => {
    useComposerStore.getState().resetComposer();
  });

  it('shows indicator dots for system prompt and custom headers', () => {
    useComposerStore.setState({
      systemPrompt: 'Be concise',
      customHeaders: [{ id: 'h1', key: 'X-Test', value: '1' }],
    });

    const { container } = render(<RequestComposer />);

    expect(
      screen.getByRole('tab', { name: /system prompt/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /headers/i })).toBeInTheDocument();
    expect(container.querySelectorAll('.bg-primary')).toHaveLength(2);
  });

  it('updates the system prompt through the textarea', () => {
    render(<RequestComposer />);

    fireEvent.click(screen.getByRole('tab', { name: /system prompt/i }));
    fireEvent.change(screen.getByPlaceholderText('System prompt (optional)'), {
      target: { value: 'You are a helpful assistant.' },
    });

    expect(useComposerStore.getState().systemPrompt).toBe(
      'You are a helpful assistant.',
    );
  });

  it('renders the child editors inside their tabs', () => {
    render(<RequestComposer />);

    expect(screen.getByText('MessageEditor Mock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /headers/i }));
    expect(screen.getByText('HeaderEditor Mock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /parameters/i }));
    expect(screen.getByText('ParameterControls Mock')).toBeInTheDocument();
  });
});
