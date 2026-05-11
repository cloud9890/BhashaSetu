import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Trash2, ChevronRight } from 'lucide-react';
import { HistoryItem, Tab } from '../../types';

interface HistoryOverlayProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  history: HistoryItem[];
  clearHistory: () => void;
  onSelectHistory: (type: Tab, output: any) => void;
}

export function HistoryOverlay({ showHistory, setShowHistory, history, clearHistory, onSelectHistory }: HistoryOverlayProps) {
  return (
    <AnimatePresence>
      {showHistory && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistory(false)}
            className="fixed inset-0 bg-[var(--app-fg)]/20 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-[var(--app-bg)] border-r border-[var(--app-fg)] z-50 p-4 md:p-6 overflow-y-auto shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest">History</h3>
              <div className="flex gap-2">
                <button onClick={clearHistory} className="p-1.5 hover:bg-red-100 text-red-600 rounded-sm transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-[var(--app-fg)]/5 rounded-sm">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
            
            {history.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                <History className="w-10 h-10 mx-auto mb-2" />
                <p className="text-xs font-mono">No history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 bg-white/50 border border-[var(--app-fg)]/10 rounded-sm cursor-pointer hover:border-[var(--app-fg)] transition-all"
                    onClick={() => onSelectHistory(item.type, item.output)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-mono uppercase bg-[var(--app-fg)] text-[var(--app-bg)] px-1.5 py-0.5 rounded-sm">
                        {item.type}
                      </span>
                      <span className="text-[9px] font-mono opacity-40">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] line-clamp-2 opacity-70">{item.input}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
