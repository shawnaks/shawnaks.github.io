/* ==========================================================================
   section registry — the five stacked sections and their hash paths
   ========================================================================== */

import type { MouseEvent } from 'react';

export type SectionId = 'hello' | 'about' | 'experience' | 'projects' | 'contact';

export type SectionDef = {
  /** The section element's id, used by scrollIntoView + the scroll spy. */
  id: SectionId;
  /** Hash path, kept compatible with the old per-page URLs. */
  to: string;
};

/** Navigation order on the single page. */
export const SECTIONS = [
  { id: 'hello', to: '/hello/' },
  { id: 'about', to: '/about/' },
  { id: 'experience', to: '/experience/' },
  { id: 'projects', to: '/projects/' },
  { id: 'contact', to: '/contact/' },
] as const satisfies readonly SectionDef[];

/** A click on a section control (tile, pill, CTA, logo). */
export type SectionNavHandler = (e: MouseEvent, to: string) => void;

function normalizePath(pathname: string): string {
  if (pathname === '' || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/** The section a hash path belongs to; `null` for everything else. */
export function sectionIdFromPath(pathname: string): SectionId | null {
  const normalized = normalizePath(pathname);

  switch (normalized) {
    case '/':
    case '/hello':
      return 'hello';
    case '/about':
      return 'about';
    case '/experience':
      return 'experience';
    case '/projects':
      return 'projects';
    case '/contact':
      return 'contact';
    default:
      return null;
  }
}

/** True for the single-page document (all five section paths + bare `/`). */
export function isMainPath(pathname: string): boolean {
  return sectionIdFromPath(pathname) !== null;
}

export function isCaseStudyPath(pathname: string): boolean {
  return normalizePath(pathname).startsWith('/case-study/');
}

/** The canonical hash path for a section id. */
export function sectionPath(id: SectionId): string {
  return SECTIONS.find((section) => section.id === id)?.to ?? '/';
}
