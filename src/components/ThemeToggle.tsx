import { useState } from 'react';
import { Icon } from './Icon';

const STORAGE_KEY = 'theme';

function currentTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
}

/**
 * Sun/moon theme switch in the header. The class is applied pre-paint by the
 * inline script in index.html; this only flips it, persists the choice and
 * keeps the browser chrome colour in sync. Defaults to light.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(currentTheme);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('theme-dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — the in-page theme still flips */
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', next === 'dark' ? '#17181d' : '#ffffff');
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
