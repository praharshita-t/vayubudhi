'use client';
import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('vayubudhi_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      if (savedTheme === 'dark') {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('vayubudhi_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    if (nextTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  if (!mounted) {
    return (
      <div className={`theme-toggle-skeleton ${className}`} />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      className={`theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'} ${className}`}
      onClick={toggleTheme}
      title={isDark ? 'Switch to Sky Blue Light Mode' : 'Switch to #212121 Dark Mode'}
      aria-label="Toggle Light / Dark Mode"
    >
      <div className="theme-toggle-track">
        <div className="theme-toggle-thumb">
          {isDark ? (
            <Moon size={13} className="theme-icon moon" />
          ) : (
            <Sun size={13} className="theme-icon sun" />
          )}
        </div>
        <span className="theme-toggle-label">
          {isDark ? 'Dark #212121' : 'Sky Light'}
        </span>
      </div>
    </button>
  );
}
