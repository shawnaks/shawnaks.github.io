import { describe, expect, it } from 'vitest';
import {
  DESKTOP_WORD,
  FONT_5X7,
  GLYPHS,
  GLYPH_COLS,
  GLYPH_ROWS,
  MOBILE_WORD,
  WORD,
  floorRow,
  wordBlocks,
  wordConfigForWidth,
  wordRaster,
} from './AsciiHero';

const LETTERS = ['H', 'E', 'L', 'O'];

const filled = (word: string) => wordRaster(word).pixels.reduce((sum, cell) => sum + cell, 0);

describe('single-word config', () => {
  it('only ever spells HELLO', () => {
    expect(WORD).toBe('HELLO');
    expect(Object.keys(FONT_5X7)).toEqual(LETTERS);
  });

  it('lays five letters out at 5 cells plus one blank gap each', () => {
    const raster = wordRaster('HELLO');
    expect(raster.cols).toBe(5 * 5 + 4);
    expect(raster.rows).toBe(7);
    expect(raster.pixels).toHaveLength(raster.cols * raster.rows);
  });

  it('keeps a blank column between letters', () => {
    const raster = wordRaster('HELLO');
    for (let y = 0; y < raster.rows; y += 1) {
      expect(raster.pixels[y * raster.cols + 5]).toBe(0);
      expect(raster.pixels[y * raster.cols + 11]).toBe(0);
    }
  });

  it('counts exactly the filled glyph pixels', () => {
    expect(filled('HELLO')).toBe(73);
  });

  it('uses only 0, 1, | and · — no block glyphs remain', () => {
    expect(GLYPHS).toEqual({ cell: '0', floor: '1', trail: '|', drizzle: '·' });
    const art = Object.values(GLYPHS).join('');
    expect(art).toBe('01|·');
    expect(art).not.toMatch(/[█▓▒░▄▁▀▌▐│•]/);
  });
});

describe('5x7 block font', () => {
  it('defines every letter needed for HELLO', () => {
    LETTERS.forEach((letter) => expect(FONT_5X7[letter]).toBeDefined());
  });

  it('is a rectangular 5x7 mask of # and .', () => {
    LETTERS.forEach((letter) => {
      const mask = FONT_5X7[letter];
      expect(mask).toHaveLength(GLYPH_ROWS);
      mask.forEach((row) => {
        expect(row).toHaveLength(GLYPH_COLS);
        expect(row).toMatch(/^[#.]{5}$/);
      });
    });
  });

  it('draws the expected letter shapes', () => {
    expect(FONT_5X7.H[3]).toBe('#####'); // crossbar
    expect(FONT_5X7.H[0][0]).toBe('#');
    expect(FONT_5X7.H[0][4]).toBe('#');
    expect(FONT_5X7.E[0]).toBe('#####');
    expect(FONT_5X7.E[6]).toBe('#####');
    expect(FONT_5X7.L[6]).toBe('#####');
    expect(FONT_5X7.O[0]).toBe('.###.');
    expect(FONT_5X7.O[0][0]).toBe('.');
    expect(FONT_5X7.O[3]).toBe('#...#');
  });
});

describe('block cells', () => {
  it('replicates every raster pixel by the config scale', () => {
    const hello = filled('HELLO');
    expect(wordBlocks('HELLO', DESKTOP_WORD)).toHaveLength(
      hello * DESKTOP_WORD.scaleX * DESKTOP_WORD.scaleY,
    );
    expect(wordBlocks('HELLO', MOBILE_WORD)).toHaveLength(hello);
  });

  it('uses the rebalanced grid rows', () => {
    expect(DESKTOP_WORD.rows).toBe(20);
    expect(MOBILE_WORD.rows).toBe(14);
    expect(floorRow(DESKTOP_WORD)).toBe(18);
    expect(floorRow(MOBILE_WORD)).toBe(12);
  });

  it('fits the desktop mask with trail room above and a floor row below', () => {
    const blocks = wordBlocks('HELLO', DESKTOP_WORD);
    const cols = blocks.map((block) => block.col);
    const rows = blocks.map((block) => block.row);
    const top = Math.min(...rows);
    const bottom = Math.max(...rows);

    expect(Math.min(...cols)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...cols)).toBeLessThan(DESKTOP_WORD.cols);
    expect(top).toBeGreaterThanOrEqual(4); // rows 0-3 for falling | trails
    expect(bottom).toBeLessThan(floorRow(DESKTOP_WORD));

    const width = Math.max(...cols) - Math.min(...cols) + 1;
    expect(width).toBe(wordRaster('HELLO').cols * DESKTOP_WORD.scaleX);
    expect(width / DESKTOP_WORD.cols).toBeGreaterThanOrEqual(0.8);
    expect(width / DESKTOP_WORD.cols).toBeLessThanOrEqual(0.9);
    expect(floorRow(DESKTOP_WORD) - bottom).toBeGreaterThanOrEqual(1);
  });

  it('fits the mobile mask with trail room above and a floor row below', () => {
    const blocks = wordBlocks('HELLO', MOBILE_WORD);
    const cols = blocks.map((block) => block.col);
    const rows = blocks.map((block) => block.row);

    expect(Math.min(...cols)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...cols)).toBeLessThan(MOBILE_WORD.cols);
    expect(Math.min(...rows)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...rows)).toBeLessThan(floorRow(MOBILE_WORD));

    const width = Math.max(...cols) - Math.min(...cols) + 1;
    expect(width).toBe(wordRaster('HELLO').cols);
    expect(width / MOBILE_WORD.cols).toBeGreaterThanOrEqual(0.75);
    expect(floorRow(MOBILE_WORD) - Math.max(...rows)).toBeGreaterThanOrEqual(1);
  });

  it('centres the word horizontally with equal margins', () => {
    const raster = wordRaster('HELLO');
    [DESKTOP_WORD, MOBILE_WORD].forEach((config) => {
      const width = raster.cols * config.scaleX;
      const left = Math.floor((config.cols - width) / 2);
      const right = config.cols - width - left;
      expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    });
  });

  it('uses the five leaf shades', () => {
    const shades = new Set(wordBlocks('HELLO', DESKTOP_WORD).map((block) => block.shade));
    expect([...shades].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('breakpoints', () => {
  it('picks the desktop grid above 767px and the mobile grid at or below it', () => {
    expect(wordConfigForWidth(1440)).toBe(DESKTOP_WORD);
    expect(wordConfigForWidth(1280)).toBe(DESKTOP_WORD);
    expect(wordConfigForWidth(768)).toBe(DESKTOP_WORD);
    expect(wordConfigForWidth(767)).toBe(MOBILE_WORD);
    expect(wordConfigForWidth(390)).toBe(MOBILE_WORD);
    expect(wordConfigForWidth(320)).toBe(MOBILE_WORD);
  });
});
