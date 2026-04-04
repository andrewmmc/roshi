import { fireEvent, render, screen } from '@testing-library/react';
import { HeaderListEditor } from './header-list-editor';

describe('HeaderListEditor', () => {
  it('updates header entries when inputs change', () => {
    const onChange = vi.fn();

    render(
      <HeaderListEditor
        headers={[{ id: 'h1', key: '', value: '' }]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Header name'), {
      target: { value: 'X-Test' },
    });
    fireEvent.change(screen.getByLabelText('Header value'), {
      target: { value: 'demo' },
    });

    expect(onChange).toHaveBeenNthCalledWith(1, [
      { id: 'h1', key: 'X-Test', value: '' },
    ]);
    expect(onChange).toHaveBeenNthCalledWith(2, [
      { id: 'h1', key: '', value: 'demo' },
    ]);
  });

  it('adds and removes header rows', () => {
    const onChange = vi.fn();

    render(
      <HeaderListEditor
        headers={[{ id: 'h1', key: 'A', value: '1' }]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /add header/i }));
    expect(onChange).toHaveBeenCalledWith([
      { id: 'h1', key: 'A', value: '1' },
      expect.objectContaining({ key: '', value: '' }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove header' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
