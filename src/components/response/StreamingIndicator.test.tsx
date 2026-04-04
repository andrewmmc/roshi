import { render, screen } from '@testing-library/react';
import { StreamingIndicator } from './StreamingIndicator';

describe('StreamingIndicator', () => {
  it('renders an accessible streaming status with three animated dots', () => {
    const { container } = render(<StreamingIndicator />);

    expect(screen.getByLabelText('Response is streaming')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-bounce')).toHaveLength(3);
  });
});
