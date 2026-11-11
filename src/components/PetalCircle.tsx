import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../hooks/useScramble';
import '../styles/petals.css';

/* --------------------------------------------------------------------------
   rosette geometry — every value is a fraction of the circle radius
   -------------------------------------------------------------------------- */
const OUTER_COUNT = 9;
const INNER_COUNT = 6;

const OUTER_RADIUS = 0.55;
const OUTER_LENGTH = 0.3;
const OUTER_WIDTH = 0.09;

const INNER_RADIUS = 0.32;
const INNER_LENGTH = 0.22;
const INNER_WIDTH = 0.07;

/* --------------------------------------------------------------------------
   motion
   -------------------------------------------------------------------------- */
/** Fraction of the remaining distance covered per 60fps frame. */
const EASE = 0.12;
/** Max angular displacement of a petal under the pointer, in radians. */
const MAX_SWIRL = 0.45;
/** Max outward push of a petal under the pointer, as a fraction of R. */
const MAX_BLOOM = 0.1;
/** The whole rosette turns a little with the pointer angle. */
const ROTATION_GAIN = 0.045;

const ANGLE_EPSILON = 0.0008;
const BLOOM_EPSILON = 0.02;
const FRAME_MS = 1000 / 60;

type Rgb = { r: number; g: number; b: number };

type Petal = {
  /** Resting angle around the centre, jittered once so it stays organic. */
  restAngle: number;
  angle: number;
  angleTarget: number;
  bloom: number;
  bloomTarget: number;
  /** Centre of the petal along its own radius. */
  radiusFrac: number;
  lengthFrac: number;
  halfWidthFrac: number;
  alpha: number;
};

const FALLBACK_ACCENT: Rgb = { r: 11, g: 133, b: 45 };

/** Read a design token and turn it into channels for alpha-layered fills. */
function parseColor(raw: string, fallback: Rgb): Rgb {
  const value = raw.trim();

  const hex = /^#([\da-f]{3,8})$/i.exec(value);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      return {
        r: parseInt(digits[0] + digits[0], 16),
        g: parseInt(digits[1] + digits[1], 16),
        b: parseInt(digits[2] + digits[2], 16),
      };
    }
    if (digits.length === 6 || digits.length === 8) {
      return {
        r: parseInt(digits.slice(0, 2), 16),
        g: parseInt(digits.slice(2, 4), 16),
        b: parseInt(digits.slice(4, 6), 16),
      };
    }
  }

  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
  }

  return fallback;
}

function withAlpha(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Shortest signed angle between -π and π. */
function wrapAngle(angle: number): number {
  let value = angle % (Math.PI * 2);
  if (value > Math.PI) value -= Math.PI * 2;
  if (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function makePetal(layer: 'outer' | 'inner', index: number, count: number): Petal {
  const step = (Math.PI * 2) / count;
  const halfStep = layer === 'inner' ? step / 2 : 0;
  const seed = layer === 'inner' ? 4.1 : 0;

  return {
    restAngle:
      -Math.PI / 2 + halfStep + index * step + Math.sin((index + 1) * 12.9898 + seed) * 0.055,
    angle: 0,
    angleTarget: 0,
    bloom: 0,
    bloomTarget: 0,
    radiusFrac: layer === 'inner' ? INNER_RADIUS : OUTER_RADIUS,
    lengthFrac:
      (layer === 'inner' ? INNER_LENGTH : OUTER_LENGTH) *
      (1 + Math.sin((index + 1) * 4.898 + seed * 0.6) * 0.07),
    halfWidthFrac: (layer === 'inner' ? INNER_WIDTH : OUTER_WIDTH) / 2,
    alpha: layer === 'inner' ? 0.68 : 0.9,
  };
}

/** A slim leaf: pointed tip and base, widest just past the middle. */
function fillPetal(ctx: CanvasRenderingContext2D, length: number, halfWidth: number): void {
  const base = -length / 2;
  const tip = length / 2;
  const shoulder = length * 0.26;

  ctx.beginPath();
  ctx.moveTo(base, 0);
  ctx.bezierCurveTo(base + shoulder, -halfWidth, tip - shoulder, -halfWidth * 0.62, tip, 0);
  ctx.bezierCurveTo(tip - shoulder, halfWidth * 0.62, base + shoulder, halfWidth, base, 0);
  ctx.closePath();
  ctx.fill();
}

/**
 * A generative green rosette inside a bordered circle. Fifteen petals (nine
 * outer, six inner, half-step offset) lean and bloom toward the pointer and
 * settle back to rest when it leaves. Purely decorative: the wrapper is
 * aria-hidden and all geometry is drawn on a DPR-scaled canvas.
 */
export function PetalCircle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ---- mutable render state (kept out of React) ---- */
    const petals: Petal[] = [];
    for (let i = 0; i < OUTER_COUNT; i += 1) petals.push(makePetal('outer', i, OUTER_COUNT));
    for (let i = 0; i < INNER_COUNT; i += 1) petals.push(makePetal('inner', i, INNER_COUNT));

    let accent = FALLBACK_ACCENT;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let visible = true;
    let reduced = prefersReducedMotion();

    let rotation = 0;
    let rotationTarget = 0;

    let pointerInside = false;
    let pointerAngle = 0;
    let pointerDistance = 0;

    let raf = 0;
    let running = false;
    let lastFrame = 0;

    const readTokens = () => {
      const styles = getComputedStyle(document.documentElement);
      accent = parseColor(styles.getPropertyValue('--accent'), accent);
    };

    /* ---- targets ---- */
    const applyTargets = () => {
      if (reduced || !pointerInside) {
        petals.forEach((petal) => {
          petal.angleTarget = 0;
          petal.bloomTarget = 0;
        });
        rotationTarget = 0;
        return;
      }

      const radius = Math.min(width, height) / 2;
      const proximity = 0.35 + 0.65 * pointerDistance;

      petals.forEach((petal) => {
        const delta = wrapAngle(petal.restAngle - pointerAngle);
        const falloff = Math.max(0, Math.cos(delta));

        // sin · cos is smooth through the pointer angle: zero when the petal
        // already points at the pointer, max 0.45 rad a quarter-turn away.
        petal.angleTarget = MAX_SWIRL * 2 * Math.sin(delta) * falloff;
        petal.bloomTarget = MAX_BLOOM * radius * falloff * falloff * proximity;
      });

      rotationTarget = pointerAngle * ROTATION_GAIN;
    };

    /* ---- drawing ---- */
    const draw = () => {
      if (!visible || width <= 0 || height <= 0) return;

      const radius = Math.min(width, height) / 2;
      const cx = width / 2;
      const cy = height / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, radius - 1), 0, Math.PI * 2);
      ctx.clip();

      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      petals.forEach((petal) => {
        ctx.save();
        ctx.rotate(petal.restAngle + petal.angle);
        ctx.translate(petal.radiusFrac * radius + petal.bloom, 0);
        ctx.fillStyle = withAlpha(accent, petal.alpha);
        fillPetal(ctx, petal.lengthFrac * radius, petal.halfWidthFrac * radius);
        ctx.restore();
      });

      ctx.restore();
    };

    /* ---- rAF loop: runs only while something is actually moving ---- */
    const isSettled = () =>
      Math.abs(rotationTarget - rotation) <= ANGLE_EPSILON &&
      petals.every(
        (petal) =>
          Math.abs(petal.angleTarget - petal.angle) <= ANGLE_EPSILON &&
          Math.abs(petal.bloomTarget - petal.bloom) <= BLOOM_EPSILON,
      );

    const tick = (now: number) => {
      raf = 0;

      if (!visible || document.hidden) {
        running = false;
        lastFrame = 0;
        return;
      }

      const deltaMs = lastFrame > 0 ? Math.min(64, now - lastFrame) : FRAME_MS;
      lastFrame = now;

      // Normalise the per-60fps lerp for the real frame duration.
      const k = 1 - (1 - EASE) ** (deltaMs / FRAME_MS);
      let moving = false;

      petals.forEach((petal) => {
        petal.angle += (petal.angleTarget - petal.angle) * k;
        petal.bloom += (petal.bloomTarget - petal.bloom) * k;

        if (
          Math.abs(petal.angleTarget - petal.angle) > ANGLE_EPSILON ||
          Math.abs(petal.bloomTarget - petal.bloom) > BLOOM_EPSILON
        ) {
          moving = true;
        }
      });

      rotation += (rotationTarget - rotation) * k;
      if (Math.abs(rotationTarget - rotation) > ANGLE_EPSILON) moving = true;

      if (!moving) {
        // Land exactly on rest/targets so a resume starts from a clean pose.
        petals.forEach((petal) => {
          petal.angle = petal.angleTarget;
          petal.bloom = petal.bloomTarget;
        });
        rotation = rotationTarget;
      }

      draw();

      if (moving) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
        lastFrame = 0;
      }
    };

    const ensureLoop = () => {
      if (reduced || !visible || document.hidden || running) return;
      running = true;
      lastFrame = 0;
      raf = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
      lastFrame = 0;
    };

    /* ---- pointer ---- */
    const setPointer = (event: PointerEvent) => {
      if (reduced) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const radius = Math.min(rect.width, rect.height) / 2;

      pointerAngle = Math.atan2(dy, dx);
      pointerDistance = radius > 0 ? Math.min(1, Math.hypot(dx, dy) / radius) : 0;
      pointerInside = true;

      applyTargets();
      ensureLoop();
    };

    const onPointerLeave = () => {
      if (reduced) return;
      pointerInside = false;
      applyTargets();
      ensureLoop();
    };

    root.addEventListener('pointerenter', setPointer);
    root.addEventListener('pointermove', setPointer, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave);

    /* ---- size / DPR ---- */
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = rect.width;
      const nextHeight = rect.height;
      if (nextWidth <= 0 || nextHeight <= 0) return;

      const nextDpr = Math.min(window.devicePixelRatio || 1, 3);
      const bufferWidth = Math.max(1, Math.round(nextWidth * nextDpr));
      const bufferHeight = Math.max(1, Math.round(nextHeight * nextDpr));

      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;

      if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
      if (canvas.height !== bufferHeight) canvas.height = bufferHeight;

      if (pointerInside) applyTargets();
      draw();
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }

    /* ---- offscreen pause ---- */
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;

          visible = entry.isIntersecting;

          if (!visible) {
            stopLoop();
            return;
          }

          draw();
          if (!reduced && !isSettled()) ensureLoop();
        },
        { threshold: 0.01 },
      );
      intersectionObserver.observe(root);
    }

    /* ---- tab visibility ---- */
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
        return;
      }

      draw();
      if (!reduced && !isSettled()) ensureLoop();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    /* ---- theme tokens ---- */
    readTokens();

    const themeObserver = new MutationObserver(() => {
      readTokens();
      draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    /* ---- reduced motion, including live preference changes ---- */
    const resetPose = () => {
      petals.forEach((petal) => {
        petal.angle = 0;
        petal.angleTarget = 0;
        petal.bloom = 0;
        petal.bloomTarget = 0;
      });
      rotation = 0;
      rotationTarget = 0;
    };

    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const onMotionChange = (event: MediaQueryListEvent) => {
      reduced = event.matches;

      if (reduced) {
        pointerInside = false;
        stopLoop();
        resetPose();
        draw();
      }
    };

    if (motionQuery) {
      reduced = motionQuery.matches;
      motionQuery.addEventListener('change', onMotionChange);
    }

    if (reduced) resetPose();

    // First paint (ResizeObserver also fires immediately, this covers the
    // fallback path and makes the initial pose deterministic).
    resize();

    return () => {
      stopLoop();
      root.removeEventListener('pointerenter', setPointer);
      root.removeEventListener('pointermove', setPointer);
      root.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery?.removeEventListener('change', onMotionChange);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', resize);
      intersectionObserver?.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div className="petal-circle" ref={rootRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
