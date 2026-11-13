import { useEffect, useState } from 'react';
import {
  THEME_STORAGE_KEY,
  isTheme,
  resolveInitialTheme,
  type Theme,
} from '../lib/theme';
import { Icon } from './Icon';

function currentTheme(): Theme {
  return document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
}

function storedTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The one place the class + browser chrome colour are written. */
function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#17181d' : '#ffffff');
}

/**
 * Sun/moon theme switch in the header. The class is applied pre-paint by the
 * inline script in index.html; this only flips it, persists the choice and
 * keeps the browser chrome colour in sync. Defaults to the time of day
 * (dark 19:00–06:59, light 07:00–18:59) unless a choice is stored.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme(storedTheme()));

  useEffect(() => {
    // Another tab switched the theme: follow it without persisting back.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (!isTheme(e.newValue)) return;
      if (e.newValue === currentTheme()) return;

      applyTheme(e.newValue);
      setTheme(e.newValue);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode — the in-page theme still flips */
    }
    setTheme(next);
  };

  const dark = theme === 'dark';

  return (
    <button
      className="theme-btn"
      type="button"
      aria-label={dark ? 'toggle light mode' : 'toggle dark mode'}
      aria-pressed={dark}
      onClick={toggle}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}
