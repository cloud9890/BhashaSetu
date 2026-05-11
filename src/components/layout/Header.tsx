import React from 'react';
import { Sparkles, History, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

interface HeaderProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
}

export function Header({ showHistory, setShowHistory }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="border-b border-[var(--app-fg)] p-4 md:p-6 flex justify-between items-center sticky top-0 bg-[var(--app-bg)] z-30">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tighter flex items-center gap-2">
          <img src="/logo.png" alt="BhashaSetu Logo" className="w-6 h-6 md:w-8 md:h-8 rounded-sm" />
          BHASHASETU
        </h1>
        <p className="text-[10px] md:text-xs font-mono opacity-60 uppercase tracking-widest mt-1 hidden sm:block">
          Multilingual NLP for Low-Resource Indian Languages
        </p>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title="Toggle Theme"
          className="p-2 rounded-sm transition-all hover:bg-[var(--app-fg)]/10 hover:scale-110 active:scale-95"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          aria-label="Toggle history"
          aria-pressed={showHistory}
          title="Toggle history"
          className={cn(
            "p-2 rounded-sm transition-all hover:scale-110 active:scale-95",
            showHistory ? "bg-[var(--app-fg)] text-[var(--app-bg)] shadow-md" : "hover:bg-[var(--app-fg)]/10"
          )}
        >
          <History className="w-5 h-5" />
        </button>
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] font-mono opacity-50 uppercase">System Status</span>
          <span className="text-xs font-mono text-green-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
            Operational
          </span>
        </div>
      </div>
    </header>
  );
}
