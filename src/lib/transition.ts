/* ==========================================================================
   page-transition manager — case-study navigation only
   The stacked sections never route, so their tile-clone flight is gone; what
   remains is the outgoing content stagger (and the reduced-motion bypass).
   ========================================================================== */

import type { MouseEvent } from 'react';
import { prefersReducedMotion } from '../hooks/useScramble';

/** Content-out choreography before the route swaps. */
export const OUT_MS = 420;

export type NavigateHandler = (e: MouseEvent, to: string) => void;

export type NavigateOptions = {
  /** The router's current pathname (used for the same-route check). */
  currentPath: string;
  /** react-router's navigate(). */
  navigate: (to: string) => void;
};

let busy = false;
let outTimer = 0;

/** Trailing-slash-insensitive comparison key. */
function normalizePath(path: string): string {
  if (path === '' || path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

/** Adds `is-leaving` to every `.anim` / `.rule` in the outgoing page. */
function leaveItems(root: ParentNode): void {
  const items = Array.from(root.querySelectorAll<HTMLElement>('.anim, .rule'));

  items.forEach((el, i) => {
    el.style.transitionDelay = `${(i * 0.04).toFixed(2)}s`;
    el.classList.add('is-leaving');
  });
}

/** Cancels a queued route swap (e.g. browser back during the out phase). */
export function endTransition(): void {
  if (outTimer) {
    window.clearTimeout(outTimer);
    outTimer = 0;
  }
  busy = false;
}

/**
 * Intercepts a case-study link, plays the outgoing choreography, then
 * navigates. Section links never come here — they scroll instead.
 */
export function navigateWithTransition(_e: MouseEvent, to: string, options: NavigateOptions): void {
  // Ignore clicks while a previous transition is still on screen.
  if (busy) return;

  if (normalizePath(to) === normalizePath(options.currentPath)) {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    return;
  }

  if (prefersReducedMotion()) {
    options.navigate(to);
    return;
  }

  busy = true;

  const page = document.getElementById('main');
  if (page) leaveItems(page);

  outTimer = window.setTimeout(() => {
    outTimer = 0;
    busy = false;
    options.navigate(to);
  }, OUT_MS);
}
