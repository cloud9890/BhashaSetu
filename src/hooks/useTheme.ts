import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('bhashasetu_theme');
    if (saved === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else if (saved === 'light') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    } else {
      // Default to user's system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('bhashasetu_theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bhashasetu_theme', 'light');
    }
  };

  return { theme, toggleTheme };
}
