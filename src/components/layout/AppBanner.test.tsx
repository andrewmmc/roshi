import { render, screen } from '@testing-library/react';
import { AppBanner } from './AppBanner';

const mockUseRequestCompatibilityPreview =
  vi.fn<() => { warnings: string[] }>();

vi.mock('@/hooks/use-request-compatibility-preview', () => ({
  useRequestCompatibilityPreview: () => mockUseRequestCompatibilityPreview(),
}));

vi.mock('@/components/onboarding/FirstRunChecklist', () => ({
  FirstRunChecklist: () => <div>FirstRunChecklist Mock</div>,
}));

vi.mock('@/components/composer/RequestCompatibilityWarning', () => ({
  RequestCompatibilityWarning: () => (
    <div>RequestCompatibilityWarning Mock</div>
  ),
}));

describe('AppBanner', () => {
  it('shows the compatibility warning in the banner area when warnings exist', () => {
    mockUseRequestCompatibilityPreview.mockReturnValue({
      warnings: ['Streaming was omitted'],
    });

    render(<AppBanner />);

    expect(
      screen.getByText('RequestCompatibilityWarning Mock'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('FirstRunChecklist Mock'),
    ).not.toBeInTheDocument();
  });

  it('falls back to the onboarding checklist when there are no warnings', () => {
    mockUseRequestCompatibilityPreview.mockReturnValue({ warnings: [] });

    render(<AppBanner />);

    expect(screen.getByText('FirstRunChecklist Mock')).toBeInTheDocument();
    expect(
      screen.queryByText('RequestCompatibilityWarning Mock'),
    ).not.toBeInTheDocument();
  });
});
