import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsDialog } from './SettingsDialog';
import { useThemeStore } from '@/stores/theme-store';
import { useUiStore } from '@/stores/ui-store';

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
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('shows the general section with a dark mode switch', () => {
    render(<SettingsDialog />);

    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
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
});
