export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

/**
 * Dark 19:00–06:59, light 07:00–18:59 in the visitor's local time.
 * Keep this in sync with the pre-paint script in index.html.
 */
const DARK_FROM_HOUR = 19;
const LIGHT_FROM_HOUR = 7;

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function themeForHour(hour: number): Theme {
  return hour >= DARK_FROM_HOUR || hour < LIGHT_FROM_HOUR ? 'dark' : 'light';
}

/** An explicit stored choice always wins; otherwise the local hour decides. */
export function resolveInitialTheme(stored: string | null, now: Date = new Date()): Theme {
  return isTheme(stored) ? stored : themeForHour(now.getHours());
}
