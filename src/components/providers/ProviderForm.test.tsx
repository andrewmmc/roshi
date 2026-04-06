import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProviderForm } from './ProviderForm';
import { makeModel, makeProvider } from '@/__tests__/fixtures';

vi.mock('@/components/ui/select', () => {
  function Select({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) {
    return (
      <select
        aria-label="select"
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    );
  }

  return {
    Select,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => <option value={value}>{children}</option>,
    SelectValue: ({ children }: { children?: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

describe('ProviderForm', () => {
  it('submits cleaned models and custom headers', () => {
    const onSubmit = vi.fn();

    const { container } = render(
      <ProviderForm
        onSubmit={onSubmit}
        initialData={{
          ...makeProvider({
            name: 'OpenAI',
            models: [
              makeModel({ id: 'gpt-4.1', displayName: 'GPT-4.1' }),
              makeModel({ id: '', displayName: '' }),
            ],
            customHeaders: { 'X-Team': 'core' },
          }),
        }}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('OpenAI'), {
      target: { value: 'OpenAI Custom' },
    });
    fireEvent.change(screen.getByDisplayValue('gpt-4.1'), {
      target: { value: 'gpt-4o' },
    });
    fireEvent.change(screen.getByDisplayValue('core'), {
      target: { value: 'platform' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'OpenAI Custom',
        type: 'openai-compatible',
        customHeaders: { 'X-Team': 'platform' },
        models: [
          expect.objectContaining({
            id: 'gpt-4o',
            name: 'gpt-4',
            displayName: 'GPT-4.1',
          }),
        ],
      }),
    );
  });

  it('maps legacy custom type to openai-compatible on submit', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ProviderForm
        onSubmit={onSubmit}
        initialData={makeProvider({ type: 'custom' })}
      />,
    );
    fireEvent.submit(container.querySelector('form')!);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'openai-compatible' }),
    );
  });

  it('shows the auth header name field for api-key-header auth', () => {
    render(
      <ProviderForm
        onSubmit={() => undefined}
        initialData={makeProvider({
          auth: { type: 'api-key-header', headerName: 'x-api-key' },
        })}
      />,
    );

    expect(screen.getByDisplayValue('x-api-key')).toBeInTheDocument();
  });

  it('disables model management for google gemini and built-in name/type edits', () => {
    render(
      <ProviderForm
        onSubmit={() => undefined}
        isBuiltIn
        initialData={makeProvider({
          type: 'google-gemini',
          models: [makeModel({ id: 'gemini-2.0-flash' })],
        })}
      />,
    );

    expect(screen.getByDisplayValue('TestProvider')).toBeDisabled();
    expect(screen.getByRole('button', { name: /add model/i })).toBeDisabled();
  });
});
