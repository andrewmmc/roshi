import { FilePlus2, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderManager } from '@/components/providers/ProviderManager';
import { HistoryList } from '@/components/history/HistoryList';
import { useRequestStore } from '@/stores/request-store';
import { useThemeStore } from '@/stores/theme-store';

export function Sidebar() {
  const reset = useRequestStore((s) => s.reset);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <div className="bg-sidebar flex h-full flex-col">
      <div className="border-sidebar-border flex h-11 shrink-0 items-center justify-between border-b px-3">
        <span className="text-foreground/80 text-[13px] font-semibold tracking-tight select-none">
          LLM Tester
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={toggleTheme}
            title={
              theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
            }
            aria-label={
              theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
            }
          >
            {theme === 'light' ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Sun className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={reset}
            title="New request"
            aria-label="New request"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </Button>
          <ProviderManager />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <HistoryList />
      </div>
    </div>
  );
}
