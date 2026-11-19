import { describe, expect, it } from 'vitest';
import { PROJECTS, getNextProject, getProject } from './projects';

type ImageSize = { width: number; height: number };

type Fs = {
  existsSync: (file: URL) => boolean;
  readFileSync: (file: URL) => Uint8Array;
};

/**
 * Node's fs, loaded dynamically because `tsc -b` type-checks this file with the
 * DOM-only app tsconfig (no Node types). Vitest runs in Node, so it resolves.
 */
async function loadFs(): Promise<Fs> {
  return (await import('node:' + 'fs')) as Fs;
}

/** Intrinsic dimensions straight from the file header — no image dependency. */
function readImageSize(fs: Fs, file: URL): ImageSize {
  const bytes = fs.readFileSync(file);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number) =>
    String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);

  if (ascii(0) === 'RIFF' && ascii(8) === 'WEBP') {
    const chunk = ascii(12);
    if (chunk === 'VP8 ') {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (chunk === 'VP8L') {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      const uint24 = (offset: number) =>
        bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
      return { width: uint24(24) + 1, height: uint24(27) + 1 };
    }
  }

  if (bytes[0] === 0x89 && ascii(12) === 'IHDR') {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      const isFrameHeader =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrameHeader) {
        return {
          width: view.getUint16(offset + 7, false),
          height: view.getUint16(offset + 5, false),
        };
      }
      offset += 2 + view.getUint16(offset + 2, false);
    }
  }

  throw new Error(`Unsupported image format: ${file.pathname}`);
}

describe('PROJECTS data', () => {
  it('has six projects with unique slugs', () => {
    expect(PROJECTS).toHaveLength(6);
    expect(new Set(PROJECTS.map((project) => project.slug)).size).toBe(PROJECTS.length);
  });

  it('gives every project at least one step with a challenge and a solution', () => {
    for (const project of PROJECTS) {
      expect(project.steps.length, project.slug).toBeGreaterThan(0);
      for (const step of project.steps) {
        expect(step.challenge.trim(), project.slug).not.toBe('');
        expect(step.solution.trim(), project.slug).not.toBe('');
      }
    }
  });
});

describe('project images', () => {
  it('gives every project a specific description and a positive intrinsic size', () => {
    for (const project of PROJECTS) {
      const image = project.image;
      expect(image, project.slug).toBeDefined();
      if (!image) continue;

      expect(image.src.trim(), project.slug).not.toBe('');
      expect(image.alt.length, project.slug).toBeGreaterThanOrEqual(20);
      expect(image.alt.toLowerCase(), project.slug).not.toContain('screenshot coming soon');
      expect(Number.isInteger(image.w), project.slug).toBe(true);
      expect(Number.isInteger(image.h), project.slug).toBe(true);
      expect(image.w, project.slug).toBeGreaterThan(0);
      expect(image.h, project.slug).toBeGreaterThan(0);
    }
  });

  it('points at a unique, existing asset whose real dimensions match', async () => {
    const fs = await loadFs();
    const sources = new Set<string>();

    for (const project of PROJECTS) {
      const image = project.image;
      expect(image, project.slug).toBeDefined();
      if (!image) continue;

      const slug = project.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(image.src, project.slug).toMatch(
        new RegExp(`^assets/projects/${slug}\\.(webp|jpg|png)$`),
      );
      expect(sources.has(image.src), `${project.slug}: duplicate ${image.src}`).toBe(false);
      sources.add(image.src);

      const file = new URL(`../../public/${image.src}`, import.meta.url);
      expect(fs.existsSync(file), `${project.slug}: missing ${image.src}`).toBe(true);
      expect(readImageSize(fs, file), project.slug).toEqual({ width: image.w, height: image.h });
    }
  });
});

describe('getProject', () => {
  it('finds every slug, case-insensitively', () => {
    for (const project of PROJECTS) {
      expect(getProject(project.slug)).toBe(project);
      expect(getProject(project.slug.toUpperCase())).toBe(project);
    }
  });
});

describe('getNextProject', () => {
  it('wraps from the last project back to the first', () => {
    expect(getNextProject('pong')).toBe(PROJECTS[0]);
    expect(getNextProject('pong')).toBe(getProject('snapfind'));
  });

  it('matches slugs case-insensitively', () => {
    expect(getNextProject('PONG')).toBe(PROJECTS[0]);
    expect(getNextProject('SNAPFIND')).toBe(PROJECTS[1]);
  });
});
