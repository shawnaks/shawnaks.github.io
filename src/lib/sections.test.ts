import { describe, expect, it } from 'vitest';
import {
  SECTIONS,
  isCaseStudyPath,
  isPlainClick,
  normalizePath,
  sectionIdFromPath,
} from './sections';

describe('normalizePath', () => {
  it('collapses empty and root paths to "/"', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
  });

  it('strips a single trailing slash', () => {
    expect(normalizePath('/about')).toBe('/about');
    expect(normalizePath('/about/')).toBe('/about');
  });
});

describe('sectionIdFromPath', () => {
  it('maps every section path, with and without the trailing slash', () => {
    for (const section of SECTIONS) {
      expect(sectionIdFromPath(section.to)).toBe(section.id);
      expect(sectionIdFromPath(section.to.slice(0, -1))).toBe(section.id);
    }
  });

  it('treats the bare root as hello', () => {
    expect(sectionIdFromPath('/')).toBe('hello');
  });

  it('returns null for unknown and case-study paths', () => {
    expect(sectionIdFromPath('/nope')).toBeNull();
    expect(sectionIdFromPath('/case-study/x')).toBeNull();
  });
});

describe('isCaseStudyPath', () => {
  it('accepts a single slug with an optional trailing slash', () => {
    expect(isCaseStudyPath('/case-study/snapfind/')).toBe(true);
    expect(isCaseStudyPath('/case-study/snapfind')).toBe(true);
  });

  it('rejects a missing slug or extra segments', () => {
    expect(isCaseStudyPath('/case-study/')).toBe(false);
    expect(isCaseStudyPath('/case-study/x/y')).toBe(false);
  });
});

describe('isPlainClick', () => {
  const click = (overrides: Partial<Parameters<typeof isPlainClick>[0]> = {}) => ({
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    button: 0,
    ...overrides,
  });

  it('accepts a primary, unmodified click', () => {
    expect(isPlainClick(click())).toBe(true);
  });

  it('rejects every modifier', () => {
    expect(isPlainClick(click({ metaKey: true }))).toBe(false);
    expect(isPlainClick(click({ ctrlKey: true }))).toBe(false);
    expect(isPlainClick(click({ shiftKey: true }))).toBe(false);
    expect(isPlainClick(click({ altKey: true }))).toBe(false);
  });

  it('rejects middle and right clicks', () => {
    expect(isPlainClick(click({ button: 1 }))).toBe(false);
    expect(isPlainClick(click({ button: 2 }))).toBe(false);
  });
});
