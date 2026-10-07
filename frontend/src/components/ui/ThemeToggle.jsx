import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle({ className = '', showLabel = false, size = 'md' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const btnSizes = {
    sm: 'p-1.5 rounded-xl',
    md: 'p-2 rounded-2xl',
    lg: 'p-2.5 rounded-2xl'
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`relative inline-flex items-center justify-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white/70 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700/90 border border-slate-200/80 dark:border-white/10 shadow-xs cursor-pointer backdrop-blur-md transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${btnSizes[size] || btnSizes.md} ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className={`${iconSizes[size] || iconSizes.md} text-amber-400 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110`} />
        ) : (
          <Moon className={`${iconSizes[size] || iconSizes.md} text-slate-600 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110`} />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold capitalize select-none">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}

export default ThemeToggle;
