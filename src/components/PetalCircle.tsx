import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../hooks/useScramble';
import '../styles/petals.css';

/* --------------------------------------------------------------------------
   the field
   -------------------------------------------------------------------------- */
const LEAF_COUNT = 26;
const MIN_LEAF_SIZE = 6;
const MAX_LEAF_SIZE = 16;
/** Keep every spawn inside this fraction of the radius, leaving edge room. */
const SPAWN_RADIUS = 0.8;

/* --------------------------------------------------------------------------
   motion — seconds and CSS pixels throughout
   -------------------------------------------------------------------------- */
/** Velocity kept per 60fps frame. */
const DAMPING_PER_FRAME = 0.964;
/** How hard a leaf is pulled toward the local wind target (1/s). */
const WIND_PULL = 1.6;
/** Weak tether to the leaf's spawn spot, so the scatter never migrates away (1/s²). */
const HOME_SPRING = 1;
/** Radial push away from the pointer, at its strongest (px/s²). */
const CURSOR_PUSH = 900;
/** Tangential curl around the pointer (px/s²). */
const CURSOR_SWIRL = 2400;
/** Radius of the cursor's wind, as a fraction of the disc radius. */
const CURSOR_REACH = 0.4;
/** Directional gust per px/s of smoothed pointer speed (1/s). */
const GUST_GAIN = 4.2;
const GUST_MAX_SPEED = 2400;
/** Inward spring once a leaf enters the soft boundary band (px/s²). */
const BOUND_SPRING = 950;
/** Radial + tangential losses at the very edge (1/s). */
const BOUND_RADIAL_DAMP = 6;
const BOUND_TANGENT_DAMP = 4;
/** Fraction of the hard limit where the soft boundary starts. */
const BOUND_SOFT = 0.78;

const MAX_DELTA = 0.064;
const FRAME_SECONDS = 1 / 60;

type Rgb = { r: number; g: number; b: number };
type Shade = { rgb: Rgb; alpha: number };

type Leaf = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  widthRatio: number;
  shadeIndex: number;
  alphaScale: number;
  fill: string;
  vein: string;
  /** 1 = counter-clockwise curl, -1 = clockwise, with a little variation. */
  swirl: number;
  mass: number;
  windGain: number;
  wanderAmp: number;
  wanderPhase: number;
  wanderFreq: number;
  spinDir: number;
  spinBase: number;
  spinFreq: number;
  spinPhase: number;
  /** Static pose, in radius fractions, for reduced motion. */
  spawnU: number;
  spawnV: number;
  spawnAngle: number;
};

const FALLBACK_ACCENT: Rgb = { r: 11, g: 133, b: 45 };

/** Light theme: dark moss through bright new growth. */
const LIGHT_SHADES: ReadonlyArray<readonly [number, number]> = [
  [-0.44, 0.82],
  [-0.22, 0.88],
  [0, 0.94],
  [0.2, 0.88],
  [0.42, 0.82],
];

/** Dark theme: deep forest through pale spring green. */
const DARK_SHADES: ReadonlyArray<readonly [number, number]> = [
  [-0.35, 0.9],
  [-0.16, 0.88],
  [0, 0.9],
  [0.28, 0.82],
  [0.55, 0.72],
];

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

/** Mix toward white (positive amount) or black (negative amount). */
function mixChannel(rgb: Rgb, amount: number): Rgb {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return {
    r: Math.round(rgb.r + (target - rgb.r) * t),
    g: Math.round(rgb.g + (target - rgb.g) * t),
    b: Math.round(rgb.b + (target - rgb.b) * t),
  };
}

function buildPalette(accent: Rgb, dark: boolean): Shade[] {
  return (dark ? DARK_SHADES : LIGHT_SHADES).map(([amount, alpha]) => ({
    rgb: mixChannel(accent, amount),
    alpha,
  }));
}

/** Deterministic layout so reduced-motion scenes and reloads stay coherent. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeLeaf(random: () => number, index: number): Leaf {
  const size = MIN_LEAF_SIZE + random() * (MAX_LEAF_SIZE - MIN_LEAF_SIZE);
  const spinDir = random() < 0.5 ? -1 : 1;

  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: random() * Math.PI * 2,
    spin: 0,
    size,
    widthRatio: 0.4 + random() * 0.16,
    shadeIndex: index % 5,
    alphaScale: 0.9 + random() * 0.16,
    fill: withAlpha(FALLBACK_ACCENT, 0.9),
    vein: 'rgba(0, 0, 0, 0.16)',
    swirl: (random() < 0.28 ? -1 : 1) * (0.55 + random() * 0.6),
    mass: 0.75 + ((size - MIN_LEAF_SIZE) / (MAX_LEAF_SIZE - MIN_LEAF_SIZE)) * 0.55,
    windGain: 0.7 + random() * 0.5,
    wanderAmp: 10 + random() * 9,
    wanderPhase: random() * Math.PI * 2,
    wanderFreq: 0.18 + random() * 0.3,
    spinDir,
    spinBase: 0.08 + random() * 0.3,
    spinFreq: 0.12 + random() * 0.28,
    spinPhase: random() * Math.PI * 2,
    spawnU: 0,
    spawnV: 0,
    spawnAngle: random() * Math.PI * 2,
  };
}

/** Scatter spawns evenly through the disc with a jittered golden-angle spiral. */
function placeLeaves(leaves: Leaf[], radius: number): void {
  const random = makeRandom(0x9e3779b9);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const startAngle = random() * Math.PI * 2;

  leaves.forEach((leaf, index) => {
    const angle = startAngle + index * goldenAngle + (random() - 0.5) * 0.6;
    const ring = Math.sqrt((index + 0.5) / leaves.length) * SPAWN_RADIUS;
    const distance = clamp(ring + (random() - 0.5) * 0.06, 0.12, SPAWN_RADIUS);
    const x = Math.cos(angle) * distance * radius;
    const y = Math.sin(angle) * distance * radius;

    leaf.x = x;
    leaf.y = y;
    leaf.spawnU = radius > 0 ? x / radius : 0;
    leaf.spawnV = radius > 0 ? y / radius : 0;
    leaf.spawnAngle = leaf.angle;
  });
}

/** A slim leaf: pointed tip, softly rounded base, widest past the middle. */
function drawLeaf(ctx: CanvasRenderingContext2D, length: number, halfWidth: number): void {
  const h = length / 2;

  ctx.beginPath();
  ctx.moveTo(-h * 0.92, 0);
  ctx.bezierCurveTo(-h * 0.56, -halfWidth * 0.92, h * 0.08, -halfWidth, h, 0);
  ctx.bezierCurveTo(h * 0.12, halfWidth * 0.8, -h * 0.52, halfWidth * 0.94, -h * 0.92, 0);
  ctx.closePath();
  ctx.fill();
}

/** A faint off-centre vein makes the slow tumble legible. */
function drawVein(ctx: CanvasRenderingContext2D, length: number, halfWidth: number): void {
  const h = length / 2;
  ctx.lineWidth = Math.max(0.45, length * 0.035);
  ctx.beginPath();
  ctx.moveTo(-h * 0.5, 0);
  ctx.quadraticCurveTo(h * 0.05, halfWidth * 0.12, h * 0.62, 0);
  ctx.stroke();
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * A wind-driven leaf field inside a bordered circle. Twenty-six leaves drift
 * on a layered sine wind while visible; the pointer becomes a gust source
 * (radial push + swirl + velocity gust) and the field settles back to ambient
 * drift when it leaves. Geometry is drawn on a DPR-scaled canvas, clipped to
 * the circle, and each leaf is also soft-bounded so nothing can escape.
 *
 * Purely decorative: the wrapper is aria-hidden, and reduced motion renders
 * the same scatter as a still frame with no rAF loop and no pointer response.
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
    const leaves: Leaf[] = [];
    for (let i = 0; i < LEAF_COUNT; i += 1) leaves.push(makeLeaf(makeRandom(0x1b873593 + i * 7919), i));
    let placed = false;

    let shades: Shade[] = buildPalette(FALLBACK_ACCENT, false);
    let dark = false;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let visible = true;
    let reduced = prefersReducedMotion();

    let pointerInside = false;
    /** Smoothed 0→1 presence of the cursor, so the gust relaxes on leave. */
    let influence = 0;
    let pointerX = 0;
    let pointerY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerTime = 0;
    let pointerVX = 0;
    let pointerVY = 0;

    let raf = 0;
    let running = false;
    let lastFrame = 0;
    let elapsed = 0;

    /* ---- palette ---- */
    const applyLeafColors = () => {
      leaves.forEach((leaf) => {
        const shade = shades[leaf.shadeIndex] ?? shades[0];
        leaf.fill = withAlpha(shade.rgb, Math.min(0.96, shade.alpha * leaf.alphaScale));
        leaf.vein = dark ? 'rgba(0, 0, 0, 0.24)' : 'rgba(0, 0, 0, 0.14)';
      });
    };

    const readTokens = () => {
      const styles = getComputedStyle(document.documentElement);
      dark = document.documentElement.classList.contains('theme-dark');
      const accent = parseColor(styles.getPropertyValue('--accent'), FALLBACK_ACCENT);
      shades = buildPalette(accent, dark);
      applyLeafColors();
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

      leaves.forEach((leaf) => {
        const halfWidth = leaf.size * leaf.widthRatio * 0.5;

        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.angle);

        ctx.fillStyle = leaf.fill;
        drawLeaf(ctx, leaf.size, halfWidth);

        if (leaf.size >= 9) {
          ctx.strokeStyle = leaf.vein;
          drawVein(ctx, leaf.size, halfWidth);
        }

        ctx.restore();
      });

      ctx.restore();
    };

    /* ---- physics ---- */
    const boundaryLimit = (leaf: Leaf, radius: number) =>
      Math.max(4, radius - leaf.size / 2 - 1.6);

    const keepInside = (leaf: Leaf, radius: number) => {
      const limit = boundaryLimit(leaf, radius);
      const distance = Math.hypot(leaf.x, leaf.y);
      if (distance <= limit || distance <= 0) return;

      const nx = leaf.x / distance;
      const ny = leaf.y / distance;
      const outward = leaf.vx * nx + leaf.vy * ny;

      if (outward > 0) {
        leaf.vx -= nx * outward * 1.2;
        leaf.vy -= ny * outward * 1.2;
      }

      leaf.x = nx * limit;
      leaf.y = ny * limit;
    };

    const simulate = (dt: number, time: number) => {
      const radius = Math.min(width, height) / 2;
      if (radius <= 0) return;

      const decay = DAMPING_PER_FRAME ** (dt * 60);

      // Ambient wind: three incommensurate π-scaled sines per axis, so the
      // field never visibly repeats while it slowly turns. A gentle vortex is
      // layered on top: it keeps the scatter distributed instead of letting a
      // purely translational breeze pile every leaf against one edge.
      const windX =
        9 * Math.sin(time * 0.061 * Math.PI + 0.7) +
        5 * Math.sin(time * 0.137 * Math.PI + 2.1) +
        3 * Math.sin(time * 0.0245 * Math.PI + 4.2);
      const windY =
        8 * Math.sin(time * 0.048 * Math.PI + 1.9) +
        4.5 * Math.sin(time * 0.118 * Math.PI + 3.4) +
        2.5 * Math.sin(time * 0.02 * Math.PI + 0.4);
      const vortex = 0.13 + 0.04 * Math.sin(time * 0.037 * Math.PI + 1.3);

      // Pointer gust relaxes as soon as the hand stops moving.
      const gustDecay = Math.exp(-3.2 * dt);
      pointerVX *= gustDecay;
      pointerVY *= gustDecay;

      const influenceTarget = pointerInside ? 1 : 0;
      influence += (influenceTarget - influence) * (1 - Math.exp(-8 * dt));
      if (!pointerInside && influence < 0.001) influence = 0;

      const pointerSpeed = Math.hypot(pointerVX, pointerVY);

      leaves.forEach((leaf) => {
        // Per-leaf wander keeps the field from moving as one rigid sheet.
        const driftDistance = Math.hypot(leaf.x, leaf.y);
        const spinX = driftDistance > 0.001 ? -leaf.y / driftDistance : 0;
        const spinY = driftDistance > 0.001 ? leaf.x / driftDistance : 0;
        const wx =
          windX * leaf.windGain +
          spinX * vortex * driftDistance +
          leaf.wanderAmp * Math.sin(time * leaf.wanderFreq + leaf.wanderPhase);
        const wy =
          windY * leaf.windGain +
          spinY * vortex * driftDistance +
          leaf.wanderAmp * Math.sin(time * leaf.wanderFreq * 1.317 + leaf.wanderPhase * 1.7);

        let ax = (wx - leaf.vx) * WIND_PULL;
        let ay = (wy - leaf.vy) * WIND_PULL;

        // A very soft tether keeps each leaf meandering around its own patch
        // instead of letting the whole cloud wander into one corner. It eases
        // off while the cursor is influencing the field so gusts stay lively.
        const tether = HOME_SPRING * (1 - 0.85 * influence);
        ax += (leaf.spawnU * radius - leaf.x) * tether;
        ay += (leaf.spawnV * radius - leaf.y) * tether;

        /* ---- cursor: radial push + tangential swirl + velocity gust ---- */
        if (influence > 0.001) {
          const dx = leaf.x - pointerX;
          const dy = leaf.y - pointerY;
          const distance = Math.max(1, Math.hypot(dx, dy));
          // A local wind cell: leaves within the cursor's reach react strongly,
          // the rest of the field keeps its ambient drift instead of being
          // blown into a ring against the border.
          const reach = Math.max(1, radius * CURSOR_REACH);
          const near = Math.min(1, distance / reach);
          const falloff = (1 - near) * (1 - near);
          const ux = dx / distance;
          const uy = dy / distance;
          const weight = influence / leaf.mass;

          ax += ux * CURSOR_PUSH * falloff * weight;
          ay += uy * CURSOR_PUSH * falloff * weight;

          const swirl = CURSOR_SWIRL * falloff * weight * leaf.swirl;
          ax += -uy * swirl;
          ay += ux * swirl;

          if (pointerSpeed > 1 && falloff > 0) {
            const gustFall = (1 - near) ** 1.25;
            const gust =
              GUST_GAIN * Math.min(pointerSpeed, GUST_MAX_SPEED) * gustFall * weight;
            ax += (pointerVX / pointerSpeed) * gust;
            ay += (pointerVY / pointerSpeed) * gust;
          }
        }

        /* ---- soft circular boundary ---- */
        const distance = Math.hypot(leaf.x, leaf.y);
        const limit = boundaryLimit(leaf, radius);
        const softStart = limit * BOUND_SOFT;

        if (distance > softStart && distance > 0) {
          const nx = leaf.x / distance;
          const ny = leaf.y / distance;
          const edge = Math.min(1.4, (distance - softStart) / Math.max(1, limit - softStart));

          // Inward spring grows quadratically as the border approaches.
          ax -= nx * BOUND_SPRING * edge * edge;
          ay -= ny * BOUND_SPRING * edge * edge;

          const outward = leaf.vx * nx + leaf.vy * ny;
          if (outward > 0) {
            const loss = Math.min(1, BOUND_RADIAL_DAMP * edge * dt);
            leaf.vx -= nx * outward * loss;
            leaf.vy -= ny * outward * loss;
          }

          const tx = -ny;
          const ty = nx;
          const tangential = leaf.vx * tx + leaf.vy * ty;
          const tangentialLoss = Math.min(1, BOUND_TANGENT_DAMP * edge * dt);
          leaf.vx -= tx * tangential * tangentialLoss;
          leaf.vy -= ty * tangential * tangentialLoss;
        }

        leaf.vx = (leaf.vx + ax * dt) * decay;
        leaf.vy = (leaf.vy + ay * dt) * decay;

        /* ---- spin follows motion ---- */
        const speed = Math.hypot(leaf.vx, leaf.vy);
        const spinTarget =
          leaf.spinBase * leaf.spinDir +
          Math.sin(time * leaf.spinFreq + leaf.spinPhase) * 0.22 +
          Math.min(5, speed * 0.012) * leaf.spinDir;
        leaf.spin += (spinTarget - leaf.spin) * (1 - Math.exp(-4 * dt));

        leaf.x += leaf.vx * dt;
        leaf.y += leaf.vy * dt;
        leaf.angle += leaf.spin * dt;

        keepInside(leaf, radius);
      });
    };

    /* ---- rAF loop: ambient wind means it runs while visible ---- */
    const tick = (now: number) => {
      raf = 0;

      if (!visible || document.hidden || reduced) {
        running = false;
        lastFrame = 0;
        return;
      }

      const delta = lastFrame > 0 ? Math.min(MAX_DELTA, (now - lastFrame) / 1000) : FRAME_SECONDS;
      lastFrame = now;
      elapsed += delta;

      simulate(delta, elapsed);
      draw();

      raf = requestAnimationFrame(tick);
    };

    const ensureLoop = () => {
      if (reduced || !visible || document.hidden || running) return;
      if (width <= 0 || height <= 0) return;
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

      // Leaves live in centre-relative coordinates (draw translates by the
      // centre), so the pointer must be mapped into the same space.
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;

      if (pointerInside && event.timeStamp > lastPointerTime) {
        const dt = clamp((event.timeStamp - lastPointerTime) / 1000, 0.008, 0.1);
        const rawVX = clamp((px - lastPointerX) / dt, -GUST_MAX_SPEED, GUST_MAX_SPEED);
        const rawVY = clamp((py - lastPointerY) / dt, -GUST_MAX_SPEED, GUST_MAX_SPEED);
        const smoothing = 1 - Math.exp(-dt / 0.05);
        pointerVX += (rawVX - pointerVX) * smoothing;
        pointerVY += (rawVY - pointerVY) * smoothing;
      } else {
        pointerVX = 0;
        pointerVY = 0;
      }

      pointerX = px;
      pointerY = py;
      lastPointerX = px;
      lastPointerY = py;
      lastPointerTime = event.timeStamp;
      pointerInside = true;

      ensureLoop();
    };

    /** Drop a stale hover when the circle scrolls away or the tab hides. */
    const releasePointer = () => {
      pointerInside = false;
      pointerVX = 0;
      pointerVY = 0;
    };

    const onPointerLeave = () => {
      if (reduced) return;
      releasePointer();
      ensureLoop();
    };

    root.addEventListener('pointerenter', setPointer);
    root.addEventListener('pointermove', setPointer, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave);
    root.addEventListener('pointercancel', onPointerLeave);

    /* ---- size / DPR ---- */
    const ensureLeaves = (radius: number) => {
      if (placed || radius <= 0) return false;
      placeLeaves(leaves, radius);
      placed = true;
      return true;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = rect.width;
      const nextHeight = rect.height;
      if (nextWidth <= 0 || nextHeight <= 0) return;

      const nextRadius = Math.min(nextWidth, nextHeight) / 2;
      const previousRadius = Math.min(width, height) / 2;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 3);
      const bufferWidth = Math.max(1, Math.round(nextWidth * nextDpr));
      const bufferHeight = Math.max(1, Math.round(nextHeight * nextDpr));

      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;

      if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
      if (canvas.height !== bufferHeight) canvas.height = bufferHeight;

      if (ensureLeaves(nextRadius)) {
        applyLeafColors();
      } else if (previousRadius > 0 && Math.abs(nextRadius - previousRadius) > 0.01) {
        const scale = nextRadius / previousRadius;
        leaves.forEach((leaf) => {
          leaf.x *= scale;
          leaf.y *= scale;
          keepInside(leaf, nextRadius);
        });
      }

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
            releasePointer();
            stopLoop();
            return;
          }

          draw();
          ensureLoop();
        },
        { threshold: 0.01 },
      );
      intersectionObserver.observe(root);
    }

    /* ---- tab visibility ---- */
    const onVisibilityChange = () => {
      if (document.hidden) {
        releasePointer();
        stopLoop();
        return;
      }

      draw();
      ensureLoop();
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
      const radius = Math.min(width, height) / 2;
      if (radius <= 0) return;

      leaves.forEach((leaf) => {
        leaf.x = leaf.spawnU * radius;
        leaf.y = leaf.spawnV * radius;
        leaf.vx = 0;
        leaf.vy = 0;
        leaf.spin = 0;
        leaf.angle = leaf.spawnAngle;
      });

      pointerInside = false;
      pointerVX = 0;
      pointerVY = 0;
      influence = 0;
      elapsed = 0;
    };

    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const onMotionChange = (event: MediaQueryListEvent) => {
      reduced = event.matches;

      if (reduced) {
        stopLoop();
        resetPose();
        draw();
      } else {
        ensureLoop();
      }
    };

    if (motionQuery) {
      reduced = motionQuery.matches;
      motionQuery.addEventListener('change', onMotionChange);
    }

    // First paint (ResizeObserver also fires immediately, this covers the
    // fallback path and makes the initial scatter deterministic).
    resize();
    if (reduced) {
      resetPose();
      draw();
    } else {
      ensureLoop();
    }

    return () => {
      stopLoop();
      root.removeEventListener('pointerenter', setPointer);
      root.removeEventListener('pointermove', setPointer);
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('pointercancel', onPointerLeave);
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
