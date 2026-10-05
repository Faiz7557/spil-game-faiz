import { create } from 'zustand';

const THEME_STORAGE_KEY = 'spil_theme';

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light'; // Default Light Mode
  } catch {
    return 'light';
  }
};

const initialTheme = getInitialTheme();

// Apply class to html immediately on module load
if (typeof document !== 'undefined') {
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useTheme = create((set, get) => ({
  theme: initialTheme,
  isDark: initialTheme === 'dark',
  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    set({ theme: next, isDark: next === 'dark' });
  },
  setTheme: (next) => {
    if (typeof document !== 'undefined') {
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    set({ theme: next, isDark: next === 'dark' });
  }
}));
