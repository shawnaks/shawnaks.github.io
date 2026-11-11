/* ==========================================================================
   section scrolling — smooth scrolls for clicks, instant for arrivals
   ========================================================================== */

import { prefersReducedMotion } from '../hooks/useScramble';
import type { SectionId } from './sections';

/** Scroll preferences respect reduced motion everywhere. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/* --------------------------------------------------------------------------
   Programmatic scroll marker.

   Section landings (tile clicks, deep links, back/forward) move the document
   for the user. The header's auto-hide must not treat that as a downward
   scroll and disappear — arriving mid-page with no header is a dead end.
   Header scroll handling asks `isProgrammaticScroll()` and ignores the hide
   rule until the landing settles.
   -------------------------------------------------------------------------- */
let programmatic = false;
let moved = false;
let settleTimer = 0;
let startTimer = 0;
let fallbackTimer = 0;

export function isProgrammaticScroll(): boolean {
  return programmatic;
}

function onProgrammaticScroll(): void {
  moved = true;
  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(endProgrammaticScroll, 150);
}

function endProgrammaticScroll(): void {
  programmatic = false;
  moved = false;
  window.clearTimeout(settleTimer);
  window.clearTimeout(startTimer);
  window.clearTimeout(fallbackTimer);
  window.removeEventListener('scroll', onProgrammaticScroll);
  window.removeEventListener('scrollend', endProgrammaticScroll);
}

function beginProgrammaticScroll(): void {
  endProgrammaticScroll();
  programmatic = true;

  window.addEventListener('scroll', onProgrammaticScroll, { passive: true });
  window.addEventListener('scrollend', endProgrammaticScroll);
  // Long smooth scrolls still settle well inside this safety net.
  fallbackTimer = window.setTimeout(endProgrammaticScroll, 4000);
  // No movement at all (e.g. clicking the section already under the header):
  // release the marker quickly so normal auto-hide resumes.
  startTimer = window.setTimeout(() => {
    if (!moved) endProgrammaticScroll();
  }, 200);
}

/**
 * Move to a section. `hello` is the top of the document (the hero is first),
 * every other section uses scrollIntoView so its CSS scroll-margin-top clears
 * the fixed 75px header.
 */
export function scrollToSection(id: SectionId, behavior: ScrollBehavior = 'smooth'): void {
  beginProgrammaticScroll();

  if (id === 'hello') {
    window.scrollTo({ top: 0, behavior });
    return;
  }

  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

function pathKey(pathname: string): string {
  if (pathname === '' || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * A click-scroll navigates (pushState) and starts its own smooth scroll.
 * The location effect would otherwise perform an instant scroll on the same
 * change, so the handler marks the path and the effect consumes the mark.
 */
let localScrollPath: string | null = null;

export function markSectionScroll(pathname: string): void {
  localScrollPath = pathKey(pathname);
}

/** Returns true when this location change was already scrolled by a click. */
export function consumeSectionScroll(pathname: string): boolean {
  const matched = localScrollPath !== null && localScrollPath === pathKey(pathname);
  localScrollPath = null;
  return matched;
}
