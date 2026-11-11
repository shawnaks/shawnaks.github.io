/* ==========================================================================
   scroll spy — shared active-section store + center-of-viewport observer
   ========================================================================== */

import { SECTIONS, sectionPath } from './sections';
import type { SectionId } from './sections';

type Listener = () => void;

let active: SectionId = 'hello';
const listeners = new Set<Listener>();
let observer: IntersectionObserver | null = null;

export function getActiveSection(): SectionId {
  return active;
}

export function subscribeActiveSection(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Update the shared active section. Passive scrolling passes `updateHash`,
 * which rewrites the current history entry's hash without notifying the
 * router (replaceState does not fire popstate/hashchange) — no history spam.
 */
export function setActiveSection(id: SectionId, updateHash = false): void {
  if (id !== active) {
    active = id;
    listeners.forEach((listener) => listener());
    if (updateHash) replaceHash(id);
  }
}

/** Rewrite the current hash to the canonical section path (no new entry). */
export function canonicalizeSectionHash(id: SectionId): void {
  replaceHash(id);
}

function replaceHash(id: SectionId): void {
  if (typeof window === 'undefined') return;

  const target = `#${sectionPath(id)}`;
  if (window.location.hash === target) return;

  window.history.replaceState(window.history.state, '', target);
}

/**
 * Observe every stacked section across the centre 10% of the viewport, so
 * whichever section owns the reading line is active. Sections are contiguous,
 * so the band always intersects one of them.
 */
export function startScrollSpy(): void {
  stopScrollSpy();

  if (typeof IntersectionObserver === 'undefined') return;

  const sections = Array.from(
    document.querySelectorAll<HTMLElement>('.page-stack > .section[id]'),
  );
  if (sections.length === 0) return;

  const visible = new Set<SectionId>();

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id as SectionId;
        if (entry.isIntersecting) visible.add(id);
        else visible.delete(id);
      });

      // Document order wins if a boundary sits inside the centre band.
      const next = SECTIONS.find((section) => visible.has(section.id));
      if (next) setActiveSection(next.id, true);
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
  );

  sections.forEach((section) => observer?.observe(section));
}

export function stopScrollSpy(): void {
  observer?.disconnect();
  observer = null;
}
