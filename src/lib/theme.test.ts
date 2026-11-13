import { describe, expect, it } from 'vitest';
import { isTheme, resolveInitialTheme, themeForHour } from './theme';

const at = (hour: number, minute = 0) => new Date(2026, 0, 15, hour, minute);

describe('isTheme', () => {
  it('accepts only the two known themes', () => {
    expect(isTheme('light')).toBe(true);
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('system')).toBe(false);
    expect(isTheme('')).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe('themeForHour', () => {
  it('is dark from 19:00 through 06:59', () => {
    for (const hour of [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6]) {
      expect(themeForHour(hour)).toBe('dark');
    }
  });

  it('is light from 07:00 through 18:59', () => {
    for (let hour = 7; hour <= 18; hour += 1) {
      expect(themeForHour(hour)).toBe('light');
    }
  });
});

describe('resolveInitialTheme', () => {
  it('flips at 07:00 and 19:00', () => {
    expect(resolveInitialTheme(null, at(6, 59))).toBe('dark');
    expect(resolveInitialTheme(null, at(7, 0))).toBe('light');
    expect(resolveInitialTheme(null, at(18, 59))).toBe('light');
    expect(resolveInitialTheme(null, at(19, 0))).toBe('dark');
    expect(resolveInitialTheme(null, at(0, 0))).toBe('dark');
    expect(resolveInitialTheme(null, at(23, 59))).toBe('dark');
  });

  it('returns a stored choice regardless of the clock', () => {
    expect(resolveInitialTheme('light', at(22))).toBe('light');
    expect(resolveInitialTheme('dark', at(12))).toBe('dark');
  });

  it('falls back to the hour for invalid, empty or missing storage', () => {
    expect(resolveInitialTheme(null, at(12))).toBe('light');
    expect(resolveInitialTheme(null, at(22))).toBe('dark');
    expect(resolveInitialTheme('', at(12))).toBe('light');
    expect(resolveInitialTheme('garbage', at(22))).toBe('dark');
    expect(resolveInitialTheme('DARK', at(12))).toBe('light');
  });
});
