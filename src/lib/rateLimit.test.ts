import { describe, expect, it } from 'vitest';
import {
  RATE_LIMIT,
  createRateLimiter,
  evaluateRateLimit,
  parseSubmissions,
} from './rateLimit';
import type { StorageLike } from './rateLimit';

const HOUR = 60 * 60 * 1000;

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    dump: () => data,
  } satisfies StorageLike & { dump: () => Map<string, string> };
}

function clockedLimiter(storage: StorageLike, start = 1_000_000) {
  let now = start;
  return {
    limiter: createRateLimiter({ storage, now: () => now }),
    advance: (ms: number) => {
      now += ms;
    },
    get now() {
      return now;
    },
  };
}

describe('evaluateRateLimit', () => {
  it('allows the first submission', () => {
    expect(evaluateRateLimit([], 1_000_000)).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it('blocks a second send immediately and reports the whole cooldown', () => {
    const now = 1_000_000;
    const status = evaluateRateLimit([now], now + 18_000);
    expect(status.allowed).toBe(false);
    if (status.allowed) return;
    expect(status.reason).toBe('cooldown');
    expect(status.retryAfterMs).toBe(42_000);
  });

  it('allows again once the 60s cooldown has passed', () => {
    const now = 1_000_000;
    expect(evaluateRateLimit([now], now + RATE_LIMIT.cooldownMs).allowed).toBe(true);
  });

  it('blocks a fourth send inside the 15-minute window even after the cooldown', () => {
    const t0 = 1_000_000;
    const times = [t0, t0 + 60_000, t0 + 120_000];
    const status = evaluateRateLimit(times, t0 + 180_000);
    expect(status.allowed).toBe(false);
    if (status.allowed) return;
    expect(status.reason).toBe('window');
    // Two of the three old sends must leave the rolling window first.
    expect(status.retryAfterMs).toBe(t0 + RATE_LIMIT.windowMs - (t0 + 180_000));
  });

  it('stops counting sends older than 15 minutes', () => {
    const t0 = 1_000_000;
    const times = [t0, t0 + 60_000, t0 + 120_000];
    expect(evaluateRateLimit(times, t0 + RATE_LIMIT.windowMs + 1).allowed).toBe(true);
  });
});

describe('createRateLimiter', () => {
  it('persists timestamps and enforces cooldown then the rolling window', () => {
    const storage = fakeStorage();
    const { limiter, advance } = clockedLimiter(storage);

    expect(limiter.status().allowed).toBe(true);
    limiter.record();

    const blocked = limiter.status();
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.reason).toBe('cooldown');
      expect(Math.ceil(blocked.retryAfterMs / 1000)).toBe(60);
    }
    expect(storage.dump().has(RATE_LIMIT.storageKey)).toBe(true);

    advance(60_000);
    expect(limiter.status().allowed).toBe(true);
    limiter.record();
    advance(60_000);
    limiter.record();

    // Three inside the window; the cooldown is over but the window blocks.
    advance(60_000);
    const windowBlocked = limiter.status();
    expect(windowBlocked.allowed).toBe(false);
    if (!windowBlocked.allowed) expect(windowBlocked.reason).toBe('window');

    advance(RATE_LIMIT.windowMs);
    expect(limiter.status().allowed).toBe(true);
  });

  it('ignores corrupt stored JSON instead of throwing', () => {
    const cases = ['{not json', '42', '{"a":1}', '[1,"two",null,{}]'];
    for (const raw of cases) {
      const storage = fakeStorage({ [RATE_LIMIT.storageKey]: raw });
      const { limiter } = clockedLimiter(storage);
      expect(() => limiter.status()).not.toThrow();
      expect(limiter.status().allowed).toBe(true);
    }
  });

  it('keeps working when storage throws on read and write', () => {
    const throwing: StorageLike = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('quota');
      },
    };
    const { limiter, advance } = clockedLimiter(throwing);

    expect(() => limiter.status()).not.toThrow();
    expect(() => limiter.record()).not.toThrow();
    expect(limiter.status().allowed).toBe(false);

    advance(60_000);
    expect(limiter.status().allowed).toBe(true);
  });
});

describe('parseSubmissions', () => {
  it('drops non-numbers and timestamps outside the window', () => {
    const now = 10 * HOUR;
    const raw = JSON.stringify([now - 10 * 60_000, now - 60_000, 'x', null]);
    expect(parseSubmissions(raw, now)).toEqual([now - 10 * 60_000, now - 60_000]);
  });
});
