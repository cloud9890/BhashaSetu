import { useState, useEffect } from 'react';
import { Tab, HistoryItem } from '../types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem('bhashasetu_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (type: Tab, input: string, output: any) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      input,
      output,
      timestamp: Date.now()
    };
    const updatedHistory = [newItem, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('bhashasetu_history', JSON.stringify(updatedHistory));
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
