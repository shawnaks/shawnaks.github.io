/* ==========================================================================
   contact-form rate limiting
   A UX courtesy, not security: the clock and storage are both client-side, so
   anyone who clears localStorage (or calls the endpoint directly) starts over.
   It exists to stop a double-click or an impatient second send, nothing more.
   ========================================================================== */

export const RATE_LIMIT = {
  storageKey: 'contact-submits-v1',
  cooldownMs: 60_000,
  windowMs: 15 * 60_000,
  maxInWindow: 3,
} as const;

/** The part of `Storage` this module needs, so tests can inject a fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type RateLimitReason = 'cooldown' | 'window';

export type RateLimitStatus =
  | { allowed: true; retryAfterMs: 0 }
  | { allowed: false; reason: RateLimitReason; retryAfterMs: number };

const memory = new Map<string, string>();

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Access itself can throw where storage is blocked; memory covers it.
    return null;
  }
}

/** Parse the stored timestamp list; anything unreadable counts as empty. */
export function parseSubmissions(raw: string | null, now: number): number[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .filter((value) => now - value < RATE_LIMIT.windowMs)
    .sort((a, b) => a - b);
}

/** Pure verdict for a list of past successful submission times. */
export function evaluateRateLimit(
  timestamps: readonly number[],
  now: number,
  config: { cooldownMs: number; windowMs: number; maxInWindow: number } = RATE_LIMIT,
): RateLimitStatus {
  const recent = timestamps
    .filter((value) => Number.isFinite(value) && now - value < config.windowMs)
    .sort((a, b) => a - b);

  const last = recent[recent.length - 1];
  if (last !== undefined && now - last < config.cooldownMs) {
    return {
      allowed: false,
      reason: 'cooldown',
      retryAfterMs: config.cooldownMs - (now - last),
    };
  }

  if (recent.length >= config.maxInWindow) {
    // A slot frees once enough of the oldest sends leave the rolling window.
    const blocking = recent[recent.length - config.maxInWindow] ?? recent[0];
    return {
      allowed: false,
      reason: 'window',
      retryAfterMs: Math.max(0, blocking + config.windowMs - now),
    };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export type RateLimiter = {
  status: (now?: number) => RateLimitStatus;
  record: (now?: number) => void;
};

export type RateLimiterOptions = {
  /** Defaults to localStorage when available, memory when not. */
  storage?: StorageLike | null;
  /** Injected for tests; defaults to Date.now. */
  now?: () => number;
  key?: string;
};

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const key = options.key ?? RATE_LIMIT.storageKey;
  const clock = options.now ?? Date.now;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;

  let storageBroken = false;

  const read = (): string | null => {
    if (!storage || storageBroken) return memory.get(key) ?? null;
    try {
      const raw = storage.getItem(key);
      if (raw !== null) memory.set(key, raw);
      return raw;
    } catch {
      storageBroken = true;
      return memory.get(key) ?? null;
    }
  };

  const write = (value: string): void => {
    memory.set(key, value);
    if (!storage || storageBroken) return;
    try {
      storage.setItem(key, value);
    } catch {
      // Private mode / quota: the in-memory copy keeps this session consistent.
      storageBroken = true;
    }
  };

  return {
    status(now = clock()) {
      return evaluateRateLimit(parseSubmissions(read(), now), now);
    },
    record(now = clock()) {
      const timestamps = [...parseSubmissions(read(), now), now];
      write(JSON.stringify(timestamps));
    },
  };
}
