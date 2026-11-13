/* ==========================================================================
   shawnak-contact — a Cloudflare Worker that emails contact-form submissions
   through Resend. The static site POSTs JSON; nothing else is exposed.
   ========================================================================== */

// Provided by the Workers runtime; RPC methods on a Durable Object only work
// when the class extends it.
import { DurableObject } from 'cloudflare:workers';

import { checkDaily, checkWindow, dayKey, prune } from './limit.js';
import { validateContact } from './validate.js';

const MAX_BODY_BYTES = 8 * 1024;

/** Local Vite dev server, so the form can be exercised without a deploy. */
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

/** Strip CR/LF so a user-typed value can never become a mail header. */
function stripLineBreaks(value) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function seconds(ms) {
  return Math.max(1, Math.ceil(ms / 1000));
}

/**
 * CORS headers are only ever emitted for an allowed origin. A request with no
 * `Origin` header (curl, a same-origin probe, server-to-server) is allowed and
 * simply gets none — the check is against browser cross-origin abuse, not auth.
 */
function resolveOrigin(header, env) {
  if (!header) return null;
  // A trailing slash in the var would never match an Origin header; forgive it.
  const allowed = [env.ALLOWED_ORIGIN?.replace(/\/$/, ''), ...DEV_ORIGINS].filter(Boolean);
  return allowed.includes(header) ? header : false;
}

function headers(origin, extra = {}) {
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...(origin
      ? {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
          vary: 'Origin',
        }
      : {}),
    ...extra,
  };
}

function respond(status, body, origin, extra) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin, extra) });
}

export default {
  async fetch(request, env) {
    const origin = resolveOrigin(request.headers.get('Origin'), env);

    if (request.method === 'OPTIONS') {
      if (origin === false) return respond(403, { ok: false, error: 'forbidden_origin' }, null);
      return new Response(null, { status: 204, headers: headers(origin) });
    }

    if (request.method !== 'POST') {
      return respond(405, { ok: false, error: 'method_not_allowed' }, origin, {
        allow: 'POST, OPTIONS',
      });
    }

    if (origin === false) {
      return respond(403, { ok: false, error: 'forbidden_origin' }, null);
    }

    const declared = Number(request.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return respond(413, { ok: false, error: 'body_too_large' }, origin);
    }

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return respond(413, { ok: false, error: 'body_too_large' }, origin);
    }

    let input;
    try {
      input = JSON.parse(text);
    } catch {
      return respond(400, { ok: false, error: 'invalid_json' }, origin);
    }

    const result = validateContact(input);
    if (!result.ok) {
      return respond(400, { ok: false, error: 'invalid_input', errors: result.errors }, origin);
    }
    const value = result.value;

    if (!env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set; nothing was sent');
      return respond(503, { ok: false, error: 'not_configured' }, origin);
    }

    // All traffic funnels through one Durable Object: it holds the per-IP
    // windows and the global daily cap, and serialises the read-modify-write.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const limiter = env.LIMITER.get(env.LIMITER.idFromName('global'));

    let verdict;
    try {
      verdict = await limiter.check(ip);
    } catch (error) {
      console.error('rate limiter unavailable:', error instanceof Error ? error.message : error);
      return respond(503, { ok: false, error: 'unavailable' }, origin);
    }

    if (!verdict || !verdict.allowed) {
      const retryAfter = Math.max(1, Math.ceil(Number(verdict?.retryAfter) || 1));
      return respond(
        429,
        { ok: false, error: 'rate_limited', retryAfter },
        origin,
        { 'retry-after': String(retryAfter) },
      );
    }

    const subject = `[portfolio] ${
      stripLineBreaks(value.subject) || 'new message'
    } — ${stripLineBreaks(value.name)}`;
    const body = [
      `name: ${stripLineBreaks(value.name)}`,
      `email: ${stripLineBreaks(value.email)}`,
      `submitted: ${new Date().toISOString()}`,
      '',
      value.message,
    ].join('\n');

    try {
      const response = await fetch(env.RESEND_API_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL,
          to: [env.TO_EMAIL],
          reply_to: value.email,
          subject,
          text: body,
        }),
      });
      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 200);
        throw new Error(`resend responded ${response.status}: ${detail}`);
      }
    } catch (error) {
      console.error('resend send failed:', error instanceof Error ? error.message : error);
      // Give the visitor their 60-second window back so a Resend outage is not
      // also a lockout. The global daily attempt stays counted.
      try {
        await limiter.release(ip, verdict.at);
      } catch (releaseError) {
        console.error(
          'rate limiter release failed:',
          releaseError instanceof Error ? releaseError.message : releaseError,
        );
      }
      return respond(502, { ok: false, error: 'send_failed' }, origin);
    }

    // The mail is out; a storage hiccup here must not turn it into an error the
    // visitor would retry (and we could not un-send it anyway).
    try {
      await limiter.commit();
    } catch (error) {
      console.error('rate limiter commit failed:', error instanceof Error ? error.message : error);
    }

    return respond(200, { ok: true }, origin);
  },
};

/**
 * Per-IP windows + the global daily send counter.
 *
 * Ordering: `check()` reserves the daily attempt and the per-IP timestamp in a
 * single write. Reserving the IP timestamp there (not after the send) is what
 * stops a burst of parallel requests from one IP: the next `check()` already
 * sees it. `release()` gives that timestamp back when Resend fails, so an
 * outage does not also lock the visitor out — the daily attempt still counts,
 * because it protects the Resend quota. `commit()` only prunes.
 *
 * No `blockConcurrencyWhile`: Durable Object input gates keep each storage
 * read/write pair uninterrupted, and these handlers have no await between
 * reading the state and writing it back.
 */
export class RateLimiter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }

  async #state() {
    const state = await this.ctx.storage.get('state');
    const valid = state !== null && typeof state === 'object' && !Array.isArray(state);
    const ips = valid && state.ips !== null && typeof state.ips === 'object' ? state.ips : {};
    return { ips, day: valid ? state.day : undefined, count: valid ? state.count : 0 };
  }

  async check(ip) {
    const now = Date.now();
    const state = await this.#state();

    const key = `ip:${ip}`;
    const recent = prune(state.ips[key], now);
    const window = checkWindow(recent, now);
    if (!window.allowed) {
      return { allowed: false, reason: window.reason, retryAfter: seconds(window.retryAfterMs) };
    }

    const day = dayKey(now);
    const used = state.day === day ? state.count : 0;
    const daily = checkDaily(used, now);
    if (!daily.allowed) {
      return { allowed: false, reason: 'daily', retryAfter: seconds(daily.retryAfterMs) };
    }

    await this.ctx.storage.put('state', {
      ...state,
      ips: { ...state.ips, [key]: [...recent, now] },
      day,
      count: used + 1,
    });
    return { allowed: true, reason: 'ok', retryAfter: 0, at: now };
  }

  /** Undo the per-IP reservation for a send that failed. */
  async release(ip, at) {
    const state = await this.#state();
    const key = `ip:${ip}`;
    const kept = (state.ips[key] ?? []).filter((time) => time !== at);
    const ips = { ...state.ips };
    if (kept.length > 0) ips[key] = kept;
    else delete ips[key];
    await this.ctx.storage.put('state', { ...state, ips });
  }

  /** Drop timestamps for IPs that have gone quiet, so storage stays bounded. */
  async commit() {
    const now = Date.now();
    const state = await this.#state();
    const ips = {};
    for (const [key, times] of Object.entries(state.ips)) {
      const kept = prune(times, now);
      if (kept.length > 0) ips[key] = kept;
    }
    await this.ctx.storage.put('state', { ...state, ips });
  }
}
