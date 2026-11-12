import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../hooks/useScramble';
import '../styles/leaf-rain.css';

/* --------------------------------------------------------------------------
   the rain — leaves fall the height of the viewport and recycle at the top
   -------------------------------------------------------------------------- */
const MIN_LEAF_SIZE = 16;
const MAX_LEAF_SIZE = 24;
const MAX_LEAVES = 70;
const MIN_LEAVES = 40;
const FADE_SECONDS = 0.4;
const TAU = Math.PI * 2;

type Rgb = { r: number; g: number; b: number };
type Shade = { rgb: Rgb; alpha: number };

type Leaf = {
  /** Horizontal anchor for the sway; the drawn x is anchor + sine offset. */
  x: number;
  y: number;
  /** Terminal fall speed, px/s. */
  vy: number;
  size: number;
  widthRatio: number;
  shadeIndex: number;
  alpha: number;
  fill: string;
  vein: string;
  swayPhase: number;
  swayFreq: number;
  swayAmp: number;
  drift: number;
  angle: number;
  spinBase: number;
  spinDir: number;
  wobbleFreq: number;
  wobblePhase: number;
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

/** Same slim teardrop as the old circle: pointed tip, widest past the middle. */
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
  ctx.lineWidth = Math.max(0.5, length * 0.035);
  ctx.beginPath();
  ctx.moveTo(-h * 0.5, 0);
  ctx.quadraticCurveTo(h * 0.05, halfWidth * 0.12, h * 0.62, 0);
  ctx.stroke();
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function makeLeaf(index: number): Leaf {
  return {
    x: 0,
    y: 0,
    vy: 0,
    size: MIN_LEAF_SIZE + Math.random() * (MAX_LEAF_SIZE - MIN_LEAF_SIZE),
    widthRatio: 0.4 + Math.random() * 0.16,
    shadeIndex: index % 5,
    alpha: 0.82 + Math.random() * 0.16,
    fill: withAlpha(FALLBACK_ACCENT, 0.85),
    vein: 'rgba(0, 0, 0, 0.14)',
    swayPhase: Math.random() * TAU,
    swayFreq: 0.35 + Math.random() * 0.55,
    swayAmp: 15 + Math.random() * 20,
    drift: (Math.random() - 0.5) * 14,
    angle: Math.random() * TAU,
    spinBase: 0.18 + Math.random() * 0.45,
    spinDir: Math.random() < 0.5 ? -1 : 1,
    wobbleFreq: 0.7 + Math.random() * 0.9,
    wobblePhase: Math.random() * TAU,
  };
}

/**
 * Full-viewport falling-leaf rain behind the about content. Leaves spawn above
 * the top edge, sink at their own terminal speed, sway on a per-leaf sine and
 * tumble gently; reaching the bottom recycles them to the top. The rain runs
 * while the about section is in view and stops (400ms fade) once the education
 * block is reached. Purely decorative: fixed overlay, behind the container,
 * reduced motion renders nothing.
 */
export function LeafRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const section = canvas.parentElement;
    const education = section?.querySelector<HTMLElement>('#about-education') ?? null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ---- mutable render state (kept out of React) ---- */
    const leaves: Leaf[] = [];
    for (let i = 0; i < MAX_LEAVES; i += 1) leaves.push(makeLeaf(i));

    let shades: Shade[] = buildPalette(FALLBACK_ACCENT, false);
    let dark = false;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let count = 0;

    let sectionVisible = false;
    let educationReached = false;
    let reduced = prefersReducedMotion();

    let running = false;
    let raining = false;
    let fading = false;
    let fade = 0;
    let raf = 0;
    let lastFrame = 0;
    let time = 0;

    /* ---- palette / theme ---- */
    const applyLeafColors = () => {
      leaves.forEach((leaf) => {
        const shade = shades[leaf.shadeIndex] ?? shades[0];
        leaf.fill = withAlpha(shade.rgb, Math.min(0.92, shade.alpha * leaf.alpha));
        leaf.vein = dark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.12)';
      });
    };

    const readTokens = () => {
      const styles = getComputedStyle(document.documentElement);
      dark = document.documentElement.classList.contains('theme-dark');
      const accent = parseColor(styles.getPropertyValue('--accent'), FALLBACK_ACCENT);
      shades = buildPalette(accent, dark);
      applyLeafColors();
    };

    /* ---- spawn / recycle ---- */
    const spawn = (leaf: Leaf, initial: boolean) => {
      leaf.x = Math.random() * Math.max(1, width);
      leaf.y = initial
        ? -leaf.size - Math.random() * height * 0.6
        : -leaf.size - Math.random() * 18;
      leaf.vy = 45 + Math.random() * 55;
      leaf.swayPhase = Math.random() * TAU;
      leaf.swayFreq = 0.35 + Math.random() * 0.55;
      leaf.swayAmp = 15 + Math.random() * 20;
      leaf.drift = (Math.random() - 0.5) * 14;
      leaf.angle = Math.random() * TAU;
      leaf.spinBase = 0.18 + Math.random() * 0.45;
      leaf.spinDir = Math.random() < 0.5 ? -1 : 1;
      leaf.wobbleFreq = 0.7 + Math.random() * 0.9;
      leaf.wobblePhase = Math.random() * TAU;
    };

    /* ---- physics ---- */
    const simulate = (dt: number) => {
      for (let i = 0; i < count; i += 1) {
        const leaf = leaves[i];

        // Fall with a small flutter around the terminal speed.
        leaf.y +=
          leaf.vy * (1 + 0.1 * Math.sin(time * leaf.wobbleFreq * 2 + leaf.wobblePhase)) * dt;

        leaf.swayPhase += leaf.swayFreq * dt;
        leaf.x += leaf.drift * dt;

        // Turn the drift around at the edges so leaves stay over the page.
        if (leaf.x < -leaf.size && leaf.drift < 0) leaf.drift = Math.abs(leaf.drift);
        if (leaf.x > width + leaf.size && leaf.drift > 0) leaf.drift = -Math.abs(leaf.drift);

        leaf.angle +=
          (leaf.spinBase * leaf.spinDir +
            Math.sin(time * leaf.wobbleFreq + leaf.wobblePhase) * 0.35) *
          dt;

        if (leaf.y - leaf.size > height) {
          if (raining) spawn(leaf, false);
          else leaf.y = height + leaf.size;
        }
      }
    };

    /* ---- drawing ---- */
    const clear = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const draw = () => {
      if (width <= 0 || height <= 0) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count; i += 1) {
        const leaf = leaves[i];
        const halfWidth = leaf.size * leaf.widthRatio * 0.5;
        const x = leaf.x + Math.sin(leaf.swayPhase) * leaf.swayAmp;

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(x, leaf.y);
        ctx.rotate(leaf.angle);
        ctx.fillStyle = leaf.fill;
        drawLeaf(ctx, leaf.size, halfWidth);
        if (leaf.size >= 19) {
          ctx.strokeStyle = leaf.vein;
          drawVein(ctx, leaf.size, halfWidth);
        }
        ctx.restore();
      }
    };

    /* ---- loop lifecycle ---- */
    const stopNow = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
      raining = false;
      fading = false;
      fade = 0;
      lastFrame = 0;
      clear();
    };

    const start = () => {
      if (running || reduced || !sectionVisible || educationReached || document.hidden) return;
      if (width <= 0 || height <= 0) return;

      // A fresh start (or a resume after a full fade) begins above the top.
      if (fade <= 0) leaves.forEach((leaf) => spawn(leaf, true));

      fade = 1;
      fading = false;
      raining = true;
      running = true;
      lastFrame = 0;
      raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      raf = 0;

      if (!sectionVisible || document.hidden || reduced) {
        stopNow();
        return;
      }

      const delta = lastFrame > 0 ? Math.min(0.064, (now - lastFrame) / 1000) : 1 / 60;
      lastFrame = now;
      time += delta;

      if (fading) {
        fade -= delta / FADE_SECONDS;
        if (fade <= 0) {
          stopNow();
          return;
        }
      } else if (fade < 1) {
        fade = Math.min(1, fade + delta / 0.15);
      }

      simulate(delta);
      draw();
      raf = requestAnimationFrame(tick);
    };

    /** Reconcile the rain with visibility, education and tab state. */
    const sync = () => {
      const mayRain =
        sectionVisible && !educationReached && !document.hidden && !reduced;

      if (mayRain) {
        fading = false;
        raining = true;
        start();
        return;
      }

      if (!running) return;

      // The only soft stop: education reached while about is still on screen.
      if (sectionVisible && educationReached && !document.hidden && !reduced) {
        fading = true;
        raining = false;
        return;
      }

      stopNow();
    };

    /* ---- size / DPR ---- */
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 3);

      const bufferWidth = Math.max(1, Math.round(width * dpr));
      const bufferHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
      if (canvas.height !== bufferHeight) canvas.height = bufferHeight;

      count = Math.round(clamp(width * 0.045, MIN_LEAVES, MAX_LEAVES));

      leaves.forEach((leaf) => {
        if (leaf.x > width + leaf.size) leaf.x = Math.random() * width;
        if (leaf.y > height + leaf.size) leaf.y = -leaf.size;
      });

      if (running) draw();
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }

    /* ---- section + education triggers ---- */
    let sectionObserver: IntersectionObserver | null = null;
    let educationObserver: IntersectionObserver | null = null;

    if (typeof IntersectionObserver !== 'undefined') {
      sectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          sectionVisible = entry.isIntersecting;
          sync();
        },
        // About is several viewports tall, so a ratio threshold is unreachable
        // at the landing position. Wait until it covers 85% of the viewport:
        // the rain then starts after the hero's copy and tile grid have left
        // the screen, with only the hero's bottom padding at the top edge.
        // (The landing position covers 90%.) A -10% margin started the rain
        // while the home tiles were still on screen.
        { threshold: 0, rootMargin: '0px 0px -85% 0px' },
      );
      sectionObserver.observe(section ?? canvas);

      if (education) {
        educationObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[entries.length - 1];
            if (!entry) return;
            educationReached = entry.isIntersecting;
            // Scrolling past education also ends intersection; stay stopped
            // whenever the block is at or above the viewport, and resume only
            // once it is below again.
            if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
              educationReached = true;
            }
            sync();
          },
          // Require the label to climb into the upper 65% before stopping, so
          // the rain covers the bio even on tall viewports.
          { threshold: 0, rootMargin: '0px 0px -35% 0px' },
        );
        educationObserver.observe(education);
      }
    } else {
      sectionVisible = true;
    }

    /* ---- tab visibility ---- */
    const onVisibilityChange = () => {
      if (document.hidden) stopNow();
      else sync();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Reconcile the education stop from geometry on scroll. The observer only
    // reports changes; a jump big enough to skip the label's band (scrollbar
    // drag, End key) would otherwise leave the rain running below education.
    // The 2px slack keeps the threshold from flickering under subpixel scroll.
    const onScroll = () => {
      if (!education) return;
      const limit = window.innerHeight * 0.65;
      const top = education.getBoundingClientRect().top;
      const reached = educationReached ? top <= limit + 2 : top <= limit;
      if (reached === educationReached) return;
      educationReached = reached;
      sync();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---- theme tokens ---- */
    readTokens();

    const themeObserver = new MutationObserver(() => {
      readTokens();
      if (running) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    /* ---- reduced motion, including live preference changes ---- */
    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const onMotionChange = (event: MediaQueryListEvent) => {
      reduced = event.matches;
      if (reduced) stopNow();
      else sync();
    };

    if (motionQuery) {
      reduced = motionQuery.matches;
      motionQuery.addEventListener('change', onMotionChange);
    }

    resize();
    sync();

    return () => {
      stopNow();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('scroll', onScroll);
      motionQuery?.removeEventListener('change', onMotionChange);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', resize);
      sectionObserver?.disconnect();
      educationObserver?.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return <canvas className="leaf-rain" ref={canvasRef} aria-hidden="true" />;
}
