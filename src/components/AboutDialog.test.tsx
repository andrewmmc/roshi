import { render, screen } from '@testing-library/react';
import { AboutDialog } from './AboutDialog';
import { useUiStore } from '@/stores/ui-store';

describe('AboutDialog', () => {
  beforeEach(() => {
    useUiStore.setState({ aboutOpen: false });
  });

  it('renders when aboutOpen is true', () => {
    useUiStore.setState({ aboutOpen: true });

    render(<AboutDialog />);

    expect(screen.getByText('About Roshi')).toBeInTheDocument();
    expect(
      screen.getByText(
        'MIT-licensed local-first workbench for testing LLM APIs',
      ),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Roshi')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Author')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('does not render when aboutOpen is false', () => {
    render(<AboutDialog />);

    expect(screen.queryByText('About Roshi')).not.toBeInTheDocument();
  });
});
