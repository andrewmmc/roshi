import { useState } from 'react';
import { FilePlus2, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AboutDialog } from '@/components/layout/AboutDialog';
import { ProviderManager } from '@/components/providers/ProviderManager';
import { HistoryList } from '@/components/history/HistoryList';
import { useRequestStore } from '@/stores/request-store';
import { useThemeStore } from '@/stores/theme-store';

export function Sidebar() {
  const reset = useRequestStore((s) => s.reset);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center justify-between px-3 h-11 border-b border-sidebar-border shrink-0">
        <button
          className="text-[13px] font-semibold text-foreground/80 tracking-tight select-none cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setAboutOpen(true)}
        >
          LLM Tester
        </button>
        <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
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
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={reset}
            title="New request"
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
