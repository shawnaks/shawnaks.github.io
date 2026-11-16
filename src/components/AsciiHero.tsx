import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../hooks/useScramble';
import '../styles/ascii-hero.css';

/* Particle-rain wordmark, inspired by the MIT-licensed piece at
   https://www.ascii-magic.com/ascii/particle-rain-word. Own implementation:
   a character grid, a hand-built 5x7 block font and a deterministic timeline. */

export const BLOCK_GLYPH = '█';
const DRIZZLE_GLYPH = '·';
const FLOOR_GLYPH = '─';

const FONT_STACK = '"Martian Mono", ui-monospace, "Cascadia Mono", Consolas, monospace';
const FONT_WEIGHT = 700;

export const GLYPH_COLS = 5;
export const GLYPH_ROWS = 7;
const GLYPH_GAP = 1;

/** Block font: seven rows of five cells, `#` filled. */
export const FONT_5X7: Record<string, readonly string[]> = {
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
};

export type WordConfig = {
  cols: number;
  rows: number;
  scaleX: number;
  scaleY: number;
};

/* 29x7 raster at 3x2 = 87 of 100 columns (87%) and 14 of 16 rows. The
   slightly wide block cells and short grid keep the whole hero inside a
   1440x900 first viewport while the word still reads as a display mark. */
export const DESKTOP_WORD: WordConfig = { cols: 100, rows: 16, scaleX: 3, scaleY: 2 };
/* One-cell pixels: 29 of 36 columns (80%). The mobile canvas aspect keeps
   those cells square, so the letters stay proportional. */
export const MOBILE_WORD: WordConfig = { cols: 36, rows: 12, scaleX: 1, scaleY: 1 };
export const MOBILE_MAX_WIDTH = 767;

export function wordConfigForWidth(width: number): WordConfig {
  return width <= MOBILE_MAX_WIDTH ? MOBILE_WORD : DESKTOP_WORD;
}

export type WordRaster = { cols: number; rows: number; pixels: Uint8Array };

/** Lay the glyph masks out in one row, one blank column between letters. */
export function wordRaster(word: string): WordRaster {
  const letters = Array.from(word.toUpperCase());
  const cols = letters.length * GLYPH_COLS + Math.max(0, letters.length - 1) * GLYPH_GAP;
  const pixels = new Uint8Array(cols * GLYPH_ROWS);

  letters.forEach((letter, letterIndex) => {
    const glyph = FONT_5X7[letter];
    if (!glyph) return;
    const x0 = letterIndex * (GLYPH_COLS + GLYPH_GAP);
    for (let y = 0; y < GLYPH_ROWS; y += 1) {
      const line = glyph[y];
      for (let x = 0; x < GLYPH_COLS; x += 1) {
        if (line[x] === '#') pixels[y * cols + x0 + x] = 1;
      }
    }
  });

  return { cols, rows: GLYPH_ROWS, pixels };
}

export type Block = { col: number; row: number; shade: number };

/** Replicate every raster pixel into scaleX x scaleY grid cells, centred. */
export function wordBlocks(word: string, config: WordConfig): Block[] {
  const raster = wordRaster(word);
  const x0 = Math.floor((config.cols - raster.cols * config.scaleX) / 2);
  const y0 = Math.floor((config.rows - raster.rows * config.scaleY) / 2);
  const blocks: Block[] = [];

  for (let y = 0; y < raster.rows; y += 1) {
    for (let x = 0; x < raster.cols; x += 1) {
      if (!raster.pixels[y * raster.cols + x]) continue;
      // Left-to-right sweep through the five leaf greens.
      const shade = Math.min(4, Math.floor((x / raster.cols) * 5));
      for (let sy = 0; sy < config.scaleY; sy += 1) {
        for (let sx = 0; sx < config.scaleX; sx += 1) {
          const col = x0 + x * config.scaleX + sx;
          const row = y0 + y * config.scaleY + sy;
          if (col >= 0 && col < config.cols && row >= 0 && row < config.rows) {
            blocks.push({ col, row, shade });
          }
        }
      }
    }
  }

  return blocks;
}

/* ---- animation timeline (seconds) ---- */
const RAIN_S = 2.2; // all grains have landed by the end
const HOLD_S = 1.7;
const POUR_S = 2.2;
const GAP_S = 0.5;
const CYCLE_S = RAIN_S + HOLD_S + POUR_S + GAP_S; // 6.6s per word
const POUR_START_S = RAIN_S + HOLD_S;
const FLASH_S = 0.1;
const POUR_GRAVITY = 30; // rows / s^2
const WORDS = ['HELLO', 'WORLD'] as const;

type Grain = {
  /** Target cell. */
  x: number;
  y: number;
  /** Cell rows above the grid where the grain spawns (negative). */
  startY: number;
  /** Seconds after the word starts. */
  delay: number;
  fall: number;
  landAt: number;
  pourAt: number;
  drift: number;
};

type WordData = { grains: Grain[]; groups: number[][] };

function buildWord(word: string, config: WordConfig): WordData {
  const blocks = wordBlocks(word, config);
  const groups: number[][] = [[], [], [], [], []];
  const grains = blocks.map((block, index) => {
    const startY = -2 - Math.random() * 6;
    const delay = 0.05 + Math.random() * 0.8;
    // Longer drops take longer; the whole word has landed before RAIN_S.
    const fall =
      0.5 + Math.sqrt((block.row - startY) / (config.rows + 8)) * 0.55 + Math.random() * 0.1;
    groups[block.shade].push(index);
    return {
      x: block.col,
      y: block.row,
      startY,
      delay,
      fall,
      landAt: delay + fall,
      // Left-to-right wash, with the lower rows leaving first.
      pourAt:
        POUR_START_S +
        (block.col / config.cols) * 1.05 +
        ((config.rows - block.row) / config.rows) * 0.3 +
        Math.random() * 0.25,
      drift: Math.random() * Math.PI * 2,
    };
  });

  return { grains, groups };
}

/* Background drizzle drifts down a three-row-wide band at its own pace. */
const DRIZZLE = Array.from({ length: 18 }, () => ({
  col: Math.random(),
  phase: Math.random() * 18,
  speed: 0.35 + Math.random() * 0.9,
}));

type Metrics = { inkW: number; inkH: number; inkLeft: number; inkTop: number };

const FALLBACK_METRICS: Metrics = { inkW: 70, inkH: 100, inkLeft: 0, inkTop: -72 };

function readGlyphMetrics(): Metrics {
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return FALLBACK_METRICS;

  probe.font = `${FONT_WEIGHT} 100px ${FONT_STACK}`;
  const measure = probe.measureText(BLOCK_GLYPH);
  const inkW = measure.actualBoundingBoxLeft + measure.actualBoundingBoxRight;
  const inkH = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;

  // The block is often supplied by a fallback face; its em box can be much
  // taller than it is wide, so the draw pass squashes it to one grid cell.
  if (!(inkW > 0) || !(inkH > 0)) return FALLBACK_METRICS;

  return {
    inkW,
    inkH,
    inkLeft: -measure.actualBoundingBoxLeft,
    inkTop: -measure.actualBoundingBoxAscent,
  };
}

/** Decorative hero wordmark. The real heading is the visually hidden h1. */
export function AsciiHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ---- mutable render state (kept out of React) ---- */
    let config = wordConfigForWidth(window.innerWidth);
    let words: WordData[] = WORDS.map((word) => buildWord(word, config));
    let metrics = readGlyphMetrics();
    let shades: string[] = [];
    let floorColor = '';
    let drizzleColor = '';

    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let cell = 0;
    let blockSize = 0;
    let blockScaleY = 1;
    let rowStep = 0;
    let baselineOffset = 0;
    let padX = 0;
    let blockFont = '';
    let drizzleFont = '';
    let floorFont = '';

    /* The boot loader covers the hero until ~1.1s; start the clock as it
       fades so the first word is seen forming, not already assembled. */
    let elapsed = document.body.classList.contains('is-loading') ? -1.2 : 0;
    let lastFrame = 0;
    let raf = 0;
    let running = false;
    let visible = false;
    let reduced = prefersReducedMotion();
    let disposed = false;

    const readTokens = () => {
      const styles = getComputedStyle(document.documentElement);
      shades = [1, 2, 3, 4, 5].map(
        (index) =>
          styles.getPropertyValue(`--cue-shade-${index}`).trim() ||
          styles.getPropertyValue('--accent-ink').trim(),
      );
      floorColor = styles.getPropertyValue('--border').trim();
      drizzleColor = styles.getPropertyValue('--gray').trim();
    };

    const measureLayout = () => {
      if (!(cssW > 0) || !(cssH > 0)) return;

      const cellH = cssH / config.rows;
      cell = cssW / config.cols;

      // Ink width = one cell; the ink box height is compressed to one cell.
      blockSize = (cell * 100) / metrics.inkW;
      blockScaleY = (cellH * metrics.inkW) / (metrics.inkH * cell);
      rowStep = cellH / blockScaleY;
      baselineOffset = (-metrics.inkTop / 100) * blockSize;
      padX = (-metrics.inkLeft / 100) * blockSize;
      blockFont = `${FONT_WEIGHT} ${blockSize}px ${FONT_STACK}`;
      drizzleFont = `${FONT_WEIGHT} ${cell * 1.2}px ${FONT_STACK}`;
      floorFont = `${FONT_WEIGHT} ${cell * 1.5}px ${FONT_STACK}`;
    };

    const rebuild = () => {
      words = WORDS.map((word) => buildWord(word, config));
      measureLayout();
    };

    const drawFrame = (time: number, still: boolean) => {
      if (!(cssW > 0) || !(cssH > 0) || shades.length < 5) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Floor line: one fixed glyph per column on the bottom row. The
      // box-drawing dash sits on the text axis, so an alphabetic baseline
      // keeps its ink inside the last row.
      ctx.font = floorFont;
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
      ctx.fillStyle = floorColor;
      const floorY = cssH - cell * 0.25;
      for (let col = 0; col < config.cols; col += 1) {
        ctx.fillText(FLOOR_GLYPH, col * cell, floorY);
      }

      // Ambient drizzle, alive between words.
      ctx.font = drizzleFont;
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = drizzleColor;
      const span = config.rows + 3;
      for (let i = 0; i < DRIZZLE.length; i += 1) {
        const drop = DRIZZLE[i];
        let row = (drop.phase + time * drop.speed) % span;
        if (row < 0) row += span;
        const col = Math.floor(drop.col * config.cols);
        ctx.fillText(DRIZZLE_GLYPH, col * cell, (row - 1) * cell);
      }
      ctx.globalAlpha = 1;

      const cycle = still ? 0 : Math.floor(time / CYCLE_S);
      const word = words[still ? 0 : cycle % words.length];
      if (!word) return;
      const t = still ? RAIN_S + HOLD_S * 0.5 : time - cycle * CYCLE_S;

      // One transform for every block: squashed to the square grid cell.
      ctx.scale(1, blockScaleY);
      ctx.font = blockFont;

      for (let shadeIndex = 0; shadeIndex < 5; shadeIndex += 1) {
        ctx.fillStyle = shades[shadeIndex];
        const group = word.groups[shadeIndex];
        for (let i = 0; i < group.length; i += 1) {
          const grain = word.grains[group[i]];
          if (t < grain.delay) continue;

          if (t < grain.landAt) {
            const progress = (t - grain.delay) / grain.fall;
            const y = grain.startY + (grain.y - grain.startY) * progress * progress;
            ctx.fillText(BLOCK_GLYPH, grain.x * cell + padX, y * rowStep + baselineOffset);
            continue;
          }

          if (t < grain.pourAt) {
            ctx.fillText(
              BLOCK_GLYPH,
              grain.x * cell + padX,
              grain.y * rowStep + baselineOffset,
            );
            continue;
          }

          // Poured off: fall past the floor and drop out of the frame.
          const pourT = t - grain.pourAt;
          const y = grain.y + 0.5 * POUR_GRAVITY * pourT * pourT;
          if (y > config.rows + 1.5) continue;
          const x = grain.x + Math.sin(pourT * 2.2 + grain.drift) * 0.35;
          ctx.fillText(BLOCK_GLYPH, x * cell + padX, y * rowStep + baselineOffset);
        }
      }

      // Landing flash: the lightest leaf green for a tenth of a second.
      ctx.fillStyle = shades[4];
      for (let i = 0; i < word.grains.length; i += 1) {
        const grain = word.grains[i];
        if (t >= grain.landAt && t < grain.landAt + FLASH_S && t < grain.pourAt) {
          ctx.fillText(BLOCK_GLYPH, grain.x * cell + padX, grain.y * rowStep + baselineOffset);
        }
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      cssW = rect.width;
      cssH = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      const bufferW = Math.max(1, Math.round(cssW * dpr));
      const bufferH = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== bufferW) canvas.width = bufferW;
      if (canvas.height !== bufferH) canvas.height = bufferH;

      // Matches the CSS media query, and the CSS aspect-ratio guarantees the
      // cell height equals the cell width.
      const next = wordConfigForWidth(window.innerWidth);
      if (next !== config) {
        config = next;
        canvas.style.aspectRatio = `${config.cols} / ${config.rows}`;
        rebuild();
      }

      measureLayout();
      drawFrame(reduced ? RAIN_S + HOLD_S * 0.5 : elapsed, reduced);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
      lastFrame = 0;
    };

    const tick = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || reduced || disposed) {
        stop();
        return;
      }
      const delta = lastFrame > 0 ? Math.min(0.064, (now - lastFrame) / 1000) : 1 / 60;
      lastFrame = now;
      elapsed += delta;
      drawFrame(elapsed, false);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduced || !visible || document.hidden || disposed) return;
      running = true;
      lastFrame = 0;
      raf = requestAnimationFrame(tick);
    };

    const sync = () => {
      if (reduced) {
        stop();
        drawFrame(RAIN_S + HOLD_S * 0.5, true);
        return;
      }
      if (visible && !document.hidden) start();
      else stop();
    };

    /* ---- observers ---- */
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          visible = entry.isIntersecting;
          sync();
        },
        { threshold: 0 },
      );
      intersectionObserver.observe(canvas);
    } else {
      visible = true;
    }

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else sync();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const themeObserver = new MutationObserver(() => {
      readTokens();
      drawFrame(reduced ? RAIN_S + HOLD_S * 0.5 : elapsed, reduced);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const onMotionChange = (event: MediaQueryListEvent) => {
      reduced = event.matches;
      sync();
    };
    if (motionQuery) {
      reduced = motionQuery.matches;
      motionQuery.addEventListener('change', onMotionChange);
    }

    /* Fonts change the glyph metrics (the block glyph usually comes from the
       monospace fallback, not Martian Mono). Re-measure, then redraw. */
    const onFontsReady = () => {
      if (disposed) return;
      metrics = readGlyphMetrics();
      measureLayout();
      drawFrame(reduced ? RAIN_S + HOLD_S * 0.5 : elapsed, reduced);
    };
    if (document.fonts) {
      void document.fonts.ready.then(onFontsReady);
      document.fonts.addEventListener('loadingdone', onFontsReady);
    }

    readTokens();
    resize();
    sync();

    return () => {
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', resize);
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery?.removeEventListener('change', onMotionChange);
      themeObserver.disconnect();
      document.fonts?.removeEventListener('loadingdone', onFontsReady);
    };
  }, []);

  return (
    <div className="ascii-hero">
      <h1 className="sr-only" id="hello-title">Hello World...</h1>
      <canvas
        ref={canvasRef}
        className="ascii-hero-canvas"
        width={1000}
        height={160}
        aria-hidden="true"
        role="presentation"
      />
    </div>
  );
}
