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

/** Trailing-slash-insensitive comparison key; `''` and `/` stay `/`. */
export function normalizePath(pathname: string): string {
  if (pathname === '' || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/** The section a hash path belongs to; `null` for everything else. */
export function sectionIdFromPath(pathname: string): SectionId | null {
  const normalized = normalizePath(pathname);
  if (normalized === '/') return 'hello';

  return SECTIONS.find((section) => normalizePath(section.to) === normalized)?.id ?? null;
}

/** True for the single-page document (all five section paths + bare `/`). */
export function isMainPath(pathname: string): boolean {
  return sectionIdFromPath(pathname) !== null;
}

export function isCaseStudyPath(pathname: string): boolean {
  // A slug segment is required: bare `#/case-study/` is the 404.
  return /^\/case-study\/[^/]+\/?$/.test(pathname);
}

/** The canonical hash path for a section id. */
export function sectionPath(id: SectionId): string {
  return SECTIONS.find((section) => section.id === id)?.to ?? '/';
}
