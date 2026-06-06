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
        protocol: 'openai-compatible-chat',
        customHeaders: { 'X-Team': 'platform' },
        models: [
          expect.objectContaining({
            id: 'gpt-4o',
            name: 'gpt-4',
            displayName: 'GPT-4.1',
            source: 'manual',
          }),
        ],
      }),
    );
  });

  it('shows the auth header name field for api-key-header auth', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ProviderForm
        onSubmit={onSubmit}
        initialData={makeProvider({
          auth: { type: 'api-key-header', headerName: 'x-api-key' },
        })}
      />,
    );

    expect(screen.getByDisplayValue('x-api-key')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('x-api-key'), {
      target: { value: 'x-new-key' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({ headerName: 'x-new-key' }),
      }),
    );
  });

  it('disables built-in name/type edits and hides the models editor', () => {
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
    // Models section is now exclusive to the Model Market for built-in providers.
    expect(
      screen.queryByRole('button', { name: /add model/i }),
    ).not.toBeInTheDocument();
  });

  it('preserves existing models when editing a built-in provider', () => {
    const onSubmit = vi.fn();
    const initial = makeProvider({
      isBuiltIn: true,
      models: [makeModel({ id: 'gpt-4', displayName: 'GPT-4' })],
    });
    const { container } = render(
      <ProviderForm onSubmit={onSubmit} isBuiltIn initialData={initial} />,
    );

    fireEvent.change(screen.getByDisplayValue('test-key'), {
      target: { value: 'new-key' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'new-key',
        models: initial.models,
      }),
    );
  });

  it('adds and removes model rows', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ProviderForm
        onSubmit={onSubmit}
        initialData={makeProvider({ models: [makeModel({ id: 'one' })] })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /add model/i }));
    fireEvent.change(screen.getAllByPlaceholderText('model-id')[1], {
      target: { value: 'two' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: /remove model/i })[0],
    );
    fireEvent.submit(container.querySelector('form')!);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        models: [expect.objectContaining({ id: 'two', name: 'two' })],
      }),
    );
  });

  it('updates auth type, endpoints, API key, and display name fields', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ProviderForm onSubmit={onSubmit} initialData={makeProvider()} />,
    );

    fireEvent.change(screen.getAllByLabelText('select')[2], {
      target: { value: 'none' },
    });
    fireEvent.change(screen.getByDisplayValue('/chat/completions'), {
      target: { value: '/v1/messages' },
    });
    fireEvent.change(screen.getByDisplayValue('/responses'), {
      target: { value: '/v1/responses' },
    });
    fireEvent.change(screen.getByDisplayValue('test-key'), {
      target: { value: 'new-key' },
    });
    fireEvent.change(screen.getByDisplayValue('GPT-4'), {
      target: { value: 'GPT Four' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { type: 'none' },
        apiKey: 'new-key',
        endpoints: { chat: '/v1/messages', responses: '/v1/responses' },
        models: [expect.objectContaining({ displayName: 'GPT Four' })],
      }),
    );
  });

  it('submits selected OpenAI protocol', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ProviderForm onSubmit={onSubmit} initialData={makeProvider()} />,
    );

    fireEvent.change(screen.getAllByLabelText('select')[1], {
      target: { value: 'openai-responses' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ protocol: 'openai-responses' }),
    );
  });
});
