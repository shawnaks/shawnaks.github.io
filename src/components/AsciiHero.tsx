import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../hooks/useScramble';
import '../styles/ascii-hero.css';

/* Particle-rain wordmark, inspired by the MIT-licensed piece at
   https://www.ascii-magic.com/ascii/particle-rain-word. Own implementation:
   a character grid, a hand-built 5x7 block font and a deterministic timeline.

   Phase -> glyph -> colour source:
     falling grain  0   brightest shade (--cue-shade-5)
     falling trail  |   brightest shade, one cell above after 0.12s
     landing flash  0   brightest shade, 0.12s
     settled letter 0   the cell's leaf shade (left-to-right gradient)
     pouring grain  0   the cell's leaf shade
     pouring trail  |   the cell's leaf shade, one cell above after 0.1s
     floor puddle   0   the cell's leaf shade, at the floor row, ±1 cell
     drizzle        ·   --gray
     floor line     1   --border
   All four characters are in the self-hosted Martian Mono latin subset, so the
   canvas uses the site face and a cell is one 0.7em advance wide. */

export const WORD = 'HELLO';

/** Every character the art draws. Letters, grains and puddles are `0`; the
    floor is a row of `1`s; trails are ASCII pipes; drizzle is a middle dot. */
export const GLYPHS = {
  cell: '0',
  floor: '1',
  trail: '|',
  drizzle: '·',
} as const;

const FONT_STACK = '"Martian Mono", ui-monospace, monospace';
const FONT_WEIGHT = 700;
/** Martian Mono advances every glyph by 0.7em. */
const ADVANCE_EM = 0.7;

export const GLYPH_COLS = 5;
export const GLYPH_ROWS = 7;
const GLYPH_GAP = 1;

/** Block font: seven rows of five cells, `#` filled. HELLO only. */
export const FONT_5X7: Record<string, readonly string[]> = {
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
};

export type WordConfig = {
  cols: number;
  rows: number;
  scaleX: number;
  scaleY: number;
};

/* 29x7 raster at 3x2 = 87 of 100 columns (87%), 14 of 20 rows from row 4.
   The rows above hold falling | trails; the last two hold the 1 floor line
   and a little air below it. */
export const DESKTOP_WORD: WordConfig = { cols: 100, rows: 20, scaleX: 3, scaleY: 2 };
/* One-cell pixels: 29 of 36 columns (80%), 7 of 14 rows from row 4. */
export const MOBILE_WORD: WordConfig = { cols: 36, rows: 14, scaleX: 1, scaleY: 1 };
export const MOBILE_MAX_WIDTH = 767;

/** The floor line and its puddles sit two rows above the canvas bottom. */
export function floorRow(config: WordConfig): number {
  return config.rows - 2;
}

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
  // One row below dead centre leaves room for trails above the word.
  const y0 = Math.floor((config.rows - raster.rows * config.scaleY) / 2) + 1;
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
const POUR_S = 2.4;
const GAP_S = 0.6;
const CYCLE_S = RAIN_S + HOLD_S + POUR_S + GAP_S; // 6.9s per cycle
const POUR_START_S = RAIN_S + HOLD_S;
const FLASH_S = 0.12;
const FALL_TRAIL_S = 0.12;
const POUR_TRAIL_S = 0.1;
const POUR_GRAVITY = 30; // rows / s^2

type Grain = {
  /** Target cell. */
  x: number;
  y: number;
  /** Cell rows above the grid where the grain spawns (negative). */
  startY: number;
  /** Seconds after the cycle starts. */
  delay: number;
  fall: number;
  landAt: number;
  pourAt: number;
  /** -1, 0 or +1 cell of floor-puddle spread. */
  puddle: number;
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
      puddle: Math.floor(Math.random() * 3) - 1,
    };
  });

  return { grains, groups };
}

/* Background drizzle drifts down the grid, above the floor. */
const DRIZZLE = Array.from({ length: 18 }, () => ({
  col: Math.random(),
  phase: Math.random() * 18,
  speed: 0.35 + Math.random() * 0.9,
}));

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
    let word = buildWord(WORD, config);
    let shades: string[] = [];
    let floorColor = '';
    let drizzleColor = '';

    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let cell = 0;
    let cellH = 0;
    let artFont = '';
    let drizzleFont = '';

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

      cell = cssW / config.cols;
      cellH = cssH / config.rows;
      // One cell = one Martian Mono advance (0.7em); square by the CSS ratio.
      artFont = `${FONT_WEIGHT} ${cell / ADVANCE_EM}px ${FONT_STACK}`;
      drizzleFont = `${FONT_WEIGHT} ${cell}px ${FONT_STACK}`;
    };

    const rebuild = () => {
      word = buildWord(WORD, config);
      measureLayout();
    };

    const drawFrame = (time: number, still: boolean) => {
      if (!(cssW > 0) || !(cssH > 0) || shades.length < 5) return;

      const floor = floorRow(config);
      const cycle = still ? 0 : Math.floor(time / CYCLE_S);
      const t = still ? RAIN_S + HOLD_S * 0.5 : time - cycle * CYCLE_S;
      const showWord = still || time >= 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = artFont;

      // Floor: a row of 1s across the full grid width.
      ctx.fillStyle = floorColor;
      for (let col = 0; col < config.cols; col += 1) {
        ctx.fillText(GLYPHS.floor, (col + 0.5) * cell, (floor + 0.5) * cellH);
      }

      // Ambient drizzle, alive between words, never below the floor.
      ctx.font = drizzleFont;
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = drizzleColor;
      const span = floor + 2;
      for (let i = 0; i < DRIZZLE.length; i += 1) {
        const drop = DRIZZLE[i];
        const drift = drop.phase + time * drop.speed;
        const row = ((drift % span) + span) % span - 1;
        const col = Math.floor(drop.col * config.cols);
        ctx.fillText(GLYPHS.drizzle, (col + 0.5) * cell, (row + 0.5) * cellH);
      }
      ctx.globalAlpha = 1;
      ctx.font = artFont;

      if (!showWord) return;

      // Falling grains: bright 0 heads with a | trail one cell above.
      ctx.fillStyle = shades[4];
      for (let i = 0; i < word.grains.length; i += 1) {
        const grain = word.grains[i];
        if (t < grain.delay || t >= grain.landAt) continue;
        const progress = (t - grain.delay) / grain.fall;
        const y = grain.startY + (grain.y - grain.startY) * progress * progress;
        ctx.fillText(GLYPHS.cell, (grain.x + 0.5) * cell, (y + 0.5) * cellH);
        if (t - grain.delay > FALL_TRAIL_S) {
          ctx.fillText(GLYPHS.trail, (grain.x + 0.5) * cell, (y - 0.5) * cellH);
        }
      }

      for (let shadeIndex = 0; shadeIndex < 5; shadeIndex += 1) {
        ctx.fillStyle = shades[shadeIndex];
        const group = word.groups[shadeIndex];
        for (let i = 0; i < group.length; i += 1) {
          const grain = word.grains[group[i]];
          if (t < grain.delay) continue;

          if (t < grain.landAt) continue; // falling, drawn above

          if (t < grain.pourAt) {
            // The landing flash covers the first 0.12s; the flash pass below
            // owns that window.
            if (t < grain.landAt + FLASH_S) continue;
            ctx.fillText(
              GLYPHS.cell,
              (grain.x + 0.5) * cell,
              (grain.y + 0.5) * cellH,
            );
            continue;
          }

          // Pouring: 0 head and a | trail one cell above, until it hits the
          // floor row. Then it becomes a 0 puddle with ±1 cell of spread.
          const pourT = t - grain.pourAt;
          const y = grain.y + 0.5 * POUR_GRAVITY * pourT * pourT;
          if (y >= floor) {
            const puddleCol = Math.min(
              config.cols - 1,
              Math.max(0, grain.x + grain.puddle),
            );
            ctx.fillText(
              GLYPHS.cell,
              (puddleCol + 0.5) * cell,
              (floor + 0.5) * cellH,
            );
            continue;
          }
          ctx.fillText(GLYPHS.cell, (grain.x + 0.5) * cell, (y + 0.5) * cellH);
          if (pourT > POUR_TRAIL_S) {
            ctx.fillText(GLYPHS.trail, (grain.x + 0.5) * cell, (y - 0.5) * cellH);
          }
        }
      }

      // Landing flash: the same 0 in the brightest shade for 0.12s.
      ctx.fillStyle = shades[4];
      for (let i = 0; i < word.grains.length; i += 1) {
        const grain = word.grains[i];
        if (t >= grain.landAt && t < grain.landAt + FLASH_S && t < grain.pourAt) {
          ctx.fillText(
            GLYPHS.cell,
            (grain.x + 0.5) * cell,
            (grain.y + 0.5) * cellH,
          );
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

    /* First paint can precede the Martian Mono swap; redraw once the face is
       ready so the grid is set in the site face, not the fallback. */
    const onFontsReady = () => {
      if (disposed) return;
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
      <h1 className="sr-only" id="hello-title">Hello</h1>
      <canvas
        ref={canvasRef}
        className="ascii-hero-canvas"
        width={1000}
        height={200}
        aria-hidden="true"
        role="presentation"
      />
    </div>
  );
}
