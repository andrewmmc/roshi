import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsDialog } from './SettingsDialog';
import { useThemeStore } from '@/stores/theme-store';
import { useUiStore } from '@/stores/ui-store';
import { useProxyStore } from '@/stores/proxy-store';

vi.mock('@/components/providers/ProviderManager', () => ({
  ProviderSettings: () => <div>Provider settings</div>,
}));

vi.mock('@/components/models/ModelMarket', () => ({
  ModelMarket: () => <div>Model market</div>,
}));

vi.mock('@/components/environments/EnvironmentManager', () => ({
  EnvironmentSettings: () => <div>Environment settings</div>,
  EnvironmentSettingsFooter: () => <div>Environment footer</div>,
}));

describe('SettingsDialog', () => {
  beforeEach(() => {
    useUiStore.setState({ settingsOpen: true, settingsPage: 'general' });
    useThemeStore.setState({ theme: 'light', initialized: true });
    useProxyStore.setState({
      httpProxy: '',
      httpsProxy: '',
      noProxy: '',
      loaded: true,
    });
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('shows the general section with a dark mode switch', () => {
    render(<SettingsDialog />);

    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Settings sections' }),
    ).toHaveClass('max-sm:flex-row', 'max-sm:overflow-x-auto');
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('toggles dark mode from general settings', () => {
    render(<SettingsDialog />);

    fireEvent.click(screen.getByRole('switch', { name: 'Dark mode' }));

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('configures HTTP_PROXY, HTTPS_PROXY, and NO_PROXY', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    useProxyStore.setState({ save });
    render(<SettingsDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'Proxy' }));
    fireEvent.change(screen.getByLabelText('HTTP_PROXY'), {
      target: { value: 'http://proxy.test:8080' },
    });
    fireEvent.change(screen.getByLabelText('HTTPS_PROXY'), {
      target: { value: 'http://secure-proxy.test:8443' },
    });
    fireEvent.change(screen.getByLabelText('NO_PROXY'), {
      target: { value: 'localhost,.internal.test' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Save proxy settings' }),
    );

    expect(save).toHaveBeenCalledWith({
      httpProxy: 'http://proxy.test:8080',
      httpsProxy: 'http://secure-proxy.test:8443',
      noProxy: 'localhost,.internal.test',
    });
    expect(
      await screen.findByText(/New requests use these settings immediately/),
    ).toBeInTheDocument();
  });
});
