import { useState, useEffect } from 'react';
import { Tab, HistoryItem } from '../types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('bhashasetu_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error('Failed to parse history from localStorage:', e);
      localStorage.removeItem('bhashasetu_history');
    }
  }, []);

  const saveToHistory = (type: Tab, input: string, output: any) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).slice(2, 11),
      type,
      input,
      output,
      timestamp: Date.now()
    };
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 20);
      localStorage.setItem('bhashasetu_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('bhashasetu_history');
  };

  return {
    history,
    showHistory,
    setShowHistory,
    saveToHistory,
    clearHistory
  };
}
