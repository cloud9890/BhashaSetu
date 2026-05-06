import React from 'react';
import { cn } from '../../lib/utils';
import { Info } from 'lucide-react';
import { Tab } from '../../types';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  tabs: Array<{ id: string; label: string; icon: any; description: string }>;
}

export function Sidebar({ activeTab, setActiveTab, tabs }: SidebarProps) {
  return (
    <nav className="w-full md:w-72 border-b md:border-b-0 md:border-r border-[#141414] p-3 md:p-6 flex flex-col gap-2 shrink-0 bg-[#E4E3E0] z-20 overflow-hidden">
      <span className="text-[10px] font-mono opacity-50 uppercase px-3 mb-1 md:mb-4 hidden md:block tracking-widest">NLP Modules</span>
      <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto scrollbar-hide pb-1 md:pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-300 text-left shrink-0 md:shrink",
              activeTab === tab.id 
                ? "bg-[#141414] text-[#E4E3E0] shadow-lg translate-x-1" 
                : "hover:bg-[#141414]/5 opacity-70 hover:opacity-100"
            )}
          >
            <tab.icon className={cn("w-4 h-4 shrink-0", activeTab === tab.id ? "text-amber-500" : "")} />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider truncate">{tab.label}</span>
              <span className={cn(
                "text-[9px] opacity-50 line-clamp-1 hidden md:block mt-0.5",
                activeTab === tab.id ? "text-white/60" : ""
              )}>
                {tab.description}
              </span>
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-auto pt-6 border-t border-[#141414]/10 hidden md:block">
        <div className="bg-[#141414]/5 p-4 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-3 h-3 opacity-60" />
            <span className="text-[10px] font-mono uppercase opacity-60">About</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-70">
            BhashaSetu leverages Gemini AI to bridge the digital divide for 22+ Indian languages, focusing on those with limited digital presence.
          </p>
        </div>
      </div>
    </nav>
  );
}
