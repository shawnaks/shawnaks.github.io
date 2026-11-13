/* ==========================================================================
   rate-limit math — pure functions, no Workers runtime
   Timestamps are epoch milliseconds of successful sends (per IP) or of send
   attempts (the global daily cap).
   ========================================================================== */

export const LIMIT = {
  /** One message per IP... */
  cooldownMs: 60_000,
  /** ...and at most three in any rolling quarter hour. */
  windowMs: 15 * 60_000,
  maxInWindow: 3,
  /** Cap on actual sends per UTC day, to stay inside Resend's free quota. */
  dailyMax: 50,
};

/** Drop anything unusable and anything outside the rolling window. */
export function prune(timestamps, now, windowMs = LIMIT.windowMs) {
  if (!Array.isArray(timestamps)) return [];
  return timestamps
    .filter(
      (value) =>
        typeof value === 'number' && Number.isFinite(value) && value <= now && now - value < windowMs,
    )
    .sort((a, b) => a - b);
}

/** Verdict for one IP's past send times. */
export function checkWindow(timestamps, now, limit = LIMIT) {
  const recent = prune(timestamps, now, limit.windowMs);
  const last = recent[recent.length - 1];

  if (last !== undefined && now - last < limit.cooldownMs) {
    return {
      allowed: false,
      reason: 'cooldown',
      retryAfterMs: limit.cooldownMs - (now - last),
    };
  }

  if (recent.length >= limit.maxInWindow) {
    // A slot frees once enough of the oldest sends leave the rolling window.
    const blocking = recent[recent.length - limit.maxInWindow];
    return {
      allowed: false,
      reason: 'window',
      retryAfterMs: Math.max(0, blocking + limit.windowMs - now),
    };
  }

  return { allowed: true, reason: 'ok', retryAfterMs: 0 };
}

/** Absolute time the next send becomes possible; `now` when already allowed. */
export function nextAllowedAt(timestamps, now, limit = LIMIT) {
  const verdict = checkWindow(timestamps, now, limit);
  return verdict.allowed ? now : now + verdict.retryAfterMs;
}

/** UTC calendar day, used to bucket the global send counter. */
export function dayKey(now) {
  return new Date(now).toISOString().slice(0, 10);
}

/** Next UTC midnight — when the daily counter resets. */
export function nextDayStart(now) {
  const dayMs = 24 * 60 * 60_000;
  return Math.floor(now / dayMs) * dayMs + dayMs;
}

/** Verdict for the global daily send counter. */
export function checkDaily(count, now, max = LIMIT.dailyMax) {
  if (Number.isFinite(count) && count >= max) {
    return {
      allowed: false,
      reason: 'daily',
      retryAfterMs: Math.max(0, nextDayStart(now) - now),
    };
  }
  return { allowed: true, reason: 'ok', retryAfterMs: 0 };
}
