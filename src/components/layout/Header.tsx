import React from 'react';
import { Sparkles, History } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HeaderProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
}

export function Header({ showHistory, setShowHistory }: HeaderProps) {
  return (
    <header className="border-b border-[#141414] p-4 md:p-6 flex justify-between items-center sticky top-0 bg-[#E4E3E0] z-30">
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
          onClick={() => setShowHistory(!showHistory)}
          className={cn(
            "p-2 rounded-sm transition-all",
            showHistory ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
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
