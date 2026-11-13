import { describe, expect, it } from 'vitest';

import {
  LIMIT,
  checkDaily,
  checkWindow,
  dayKey,
  nextAllowedAt,
  nextDayStart,
  prune,
} from './limit.js';

const NOW = Date.UTC(2026, 10, 13, 12, 0, 0);
const MINUTE = 60_000;
const WINDOW = LIMIT.windowMs;

describe('prune', () => {
  it('drops stale, future, and corrupt entries', () => {
    const kept = prune(
      [NOW - WINDOW - 1, NOW - MINUTE, NOW + 5 * MINUTE, 'x', NaN, Infinity, null, undefined, {}],
      NOW,
    );
    expect(kept).toEqual([NOW - MINUTE]);
  });

  it('sorts ascending and tolerates a missing array', () => {
    expect(prune([NOW - MINUTE, NOW - 2 * MINUTE], NOW)).toEqual([
      NOW - 2 * MINUTE,
      NOW - MINUTE,
    ]);
    expect(prune(undefined, NOW)).toEqual([]);
    expect(prune(null, NOW)).toEqual([]);
    expect(prune('nope', NOW)).toEqual([]);
  });
});

describe('checkWindow', () => {
  it('allows the first send', () => {
    expect(checkWindow([], NOW)).toEqual({ allowed: true, reason: 'ok', retryAfterMs: 0 });
    expect(checkWindow(undefined, NOW).allowed).toBe(true);
  });

  it('allows one per 60 seconds', () => {
    const blocked = checkWindow([NOW - 10_000], NOW);
    expect(blocked).toEqual({
      allowed: false,
      reason: 'cooldown',
      retryAfterMs: 50_000,
    });
    // Exactly 60s later the cooldown has elapsed.
    expect(checkWindow([NOW - 60_000], NOW).allowed).toBe(true);
  });

  it('allows at most three per rolling 15 minutes', () => {
    const sends = [NOW - 10 * MINUTE, NOW - 5 * MINUTE, NOW - 2 * MINUTE];
    const blocked = checkWindow(sends, NOW);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe('window');
    // The oldest send leaves the window at NOW + 5 minutes.
    expect(blocked.retryAfterMs).toBe(5 * MINUTE);
  });

  it('frees a slot when the oldest send rolls out', () => {
    const sends = [NOW - 10 * MINUTE, NOW - 5 * MINUTE, NOW - 2 * MINUTE];
    expect(checkWindow(sends, NOW + 5 * MINUTE + 1).allowed).toBe(true);
  });

  it('never returns a negative retry', () => {
    const blocked = checkWindow([NOW - WINDOW + 1, NOW - MINUTE, NOW - 30_000], NOW);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('ignores stale timestamps entirely', () => {
    const old = [NOW - 3 * WINDOW, NOW - 2 * WINDOW, NOW - WINDOW];
    expect(checkWindow(old, NOW).allowed).toBe(true);
  });

  it('survives corrupt values', () => {
    expect(checkWindow([null, 'x', NaN, Infinity, {}], NOW).allowed).toBe(true);
  });
});

describe('nextAllowedAt', () => {
  it('is now when allowed', () => {
    expect(nextAllowedAt([], NOW)).toBe(NOW);
  });

  it('is the cooldown end when cooling down', () => {
    expect(nextAllowedAt([NOW - 10_000], NOW)).toBe(NOW + 50_000);
  });

  it('is the window rollover when the hourly cap is hit', () => {
    const sends = [NOW - 10 * MINUTE, NOW - 5 * MINUTE, NOW - 2 * MINUTE];
    expect(nextAllowedAt(sends, NOW)).toBe(NOW + 5 * MINUTE);
  });
});

describe('checkDaily', () => {
  it('allows below the cap', () => {
    expect(checkDaily(0, NOW)).toEqual({ allowed: true, reason: 'ok', retryAfterMs: 0 });
    expect(checkDaily(LIMIT.dailyMax - 1, NOW).allowed).toBe(true);
  });

  it('blocks at the cap until the next UTC midnight', () => {
    const verdict = checkDaily(LIMIT.dailyMax, NOW);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe('daily');
    expect(verdict.retryAfterMs).toBe(nextDayStart(NOW) - NOW);
    expect(verdict.retryAfterMs).toBe(12 * 60 * MINUTE);
  });

  it('treats a corrupt counter as zero', () => {
    expect(checkDaily(NaN, NOW).allowed).toBe(true);
    expect(checkDaily('many', NOW).allowed).toBe(true);
  });
});

describe('dayKey', () => {
  it('buckets by UTC date', () => {
    expect(dayKey(NOW)).toBe('2026-11-13');
    expect(dayKey(NOW + 12 * 60 * MINUTE)).toBe('2026-11-14');
    expect(nextDayStart(NOW)).toBe(Date.UTC(2026, 10, 14));
  });
});
