import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { AboutDialog } from './AboutDialog';
import { listen } from '@tauri-apps/api/event';

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

describe('AboutDialog', () => {
  it('opens when the show-about event is emitted and unregisters on cleanup', async () => {
    let handler: (() => void) | undefined;
    const unlisten = vi.fn();

    vi.mocked(listen).mockImplementation((_event, callback) => {
      handler = () => {
        callback({} as never);
      };
      return Promise.resolve(unlisten);
    });

    const { unmount } = render(React.createElement(AboutDialog));

    expect(screen.queryByText('About Roshi')).not.toBeInTheDocument();

    await act(async () => {
      handler?.();
    });

    expect(await screen.findByText('About Roshi')).toBeInTheDocument();
    expect(
      screen.getByText(
        'MIT-licensed local-first workbench for testing LLM APIs',
      ),
    ).toBeInTheDocument();

    unmount();
    await act(async () => {
      await Promise.resolve();
    });

    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
