import { useEffect, useState } from 'react';
import { Icon } from './Icon';

const STORAGE_KEY = 'theme';

function currentTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
}

/** The one place the class + browser chrome colour are written. */
function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#17181d' : '#ffffff');
}

/**
 * Sun/moon theme switch in the header. The class is applied pre-paint by the
 * inline script in index.html; this only flips it, persists the choice and
 * keeps the browser chrome colour in sync. Defaults to light.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(currentTheme);

  useEffect(() => {
    // Another tab switched the theme: follow it without persisting back.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue !== 'light' && e.newValue !== 'dark') return;
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
      localStorage.setItem(STORAGE_KEY, next);
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
