import { fireEvent, render, screen } from '@testing-library/react';
import { PasswordInput } from './password-input';

describe('PasswordInput', () => {
  it('toggles between hidden and visible states', () => {
    render(<PasswordInput value="secret" onChange={() => undefined} />);

    const input = screen.getByDisplayValue('secret');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
