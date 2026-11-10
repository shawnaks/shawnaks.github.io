/* ==========================================================================
   page-transition manager
   vanilla parity: js/main.js — makeClone / leaveItems / show + pendingRect
   ========================================================================== */

import type { MouseEvent } from 'react';
import { prefersReducedMotion } from '../hooks/useScramble';

/** Content-out choreography before the route swaps. */
export const OUT_MS = 420;
/** Clone flight (matches the .45s CSS transition on .tile-clone). */
export const FLIGHT_MS = 450;
/** Fade-out window before the clone node is removed. */
export const CLONE_REMOVE_MS = 350;
/** How long a clone-less navigation stays guarded after landing. */
export const NO_CLONE_SETTLE_MS = 480;
/** Vanilla enterItems runs ~700ms after the swap; the clone lands at ~450ms. */
export const REVEAL_DELAY_MS = 600;

export type NavigateHandler = (e: MouseEvent, to: string) => void;

export type NavigateOptions = {
  /** The router's current pathname (used for the same-route check). */
  currentPath: string;
  /** Closes the fullscreen menu, if it is open. */
  closeMenu: () => void;
  /** react-router's navigate(). */
  navigate: (to: string) => void;
};

type Flight = {
  clone: HTMLElement;
  /** Normalized destination, so a stale flight can be discarded. */
  to: string;
};

let busy = false;
let outTimer = 0;
let flight: Flight | null = null;

/** Trailing-slash-insensitive comparison key. */
export function normalizePath(path: string): string {
  if (path === '' || path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

/** Adds `is-leaving` to every `.anim` / `.rule` in the outgoing page. */
export function leaveItems(root: ParentNode): void {
  const items = Array.from(root.querySelectorAll<HTMLElement>('.anim, .rule'));

  items.forEach((el, i) => {
    el.style.transitionDelay = `${(i * 0.04).toFixed(2)}s`;
    el.classList.add('is-leaving');
  });
}

/**
 * Snapshot of the clicked tile, fixed at its captured viewport rect.
 * Mirrors vanilla `makeClone` (without the flight, which starts on landing).
 */
function makeClone(source: HTMLElement, rect: DOMRect): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;

  clone.classList.remove('is-active', 'is-entering', 'is-leaving');
  clone.classList.add('tile-clone');
  clone.setAttribute('aria-hidden', 'true');
  clone.removeAttribute('href');
  clone.removeAttribute('id');
  clone.removeAttribute('data-section');
  clone.removeAttribute('aria-current');
  clone.removeAttribute('tabindex');

  Object.assign(clone.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });

  document.body.appendChild(clone);
  return clone;
}

export function isTransitioning(): boolean {
  return busy;
}

/** True while the clone has been created but not yet consumed on landing. */
export function cloneInFlight(): boolean {
  return flight !== null;
}

/** Stagger delay for the landing page's reveal (0 for ordinary mounts). */
export function revealDelay(): number {
  return flight ? REVEAL_DELAY_MS : 0;
}

/** Hands the waiting clone to the landing effect and clears the queue slot. */
export function consumeFlight(): Flight | null {
  const pending = flight;
  flight = null;
  return pending;
}

/** Cancels a queued route swap (e.g. browser back during the out phase). */
export function cancelOutPhase(): void {
  if (outTimer) {
    window.clearTimeout(outTimer);
    outTimer = 0;
  }
}

/** Releases the busy guard. Safe to call more than once. */
export function endTransition(): void {
  cancelOutPhase();
  busy = false;
}

/**
 * Intercepts a route click, plays the outgoing choreography, then navigates.
 * The clicked rect is captured before the menu closes (vanilla pendingRect).
 */
export function navigateWithTransition(e: MouseEvent, to: string, options: NavigateOptions): void {
  // Ignore clicks while a previous transition is still on screen.
  if (busy) return;

  const targetPath = normalizePath(to);

  if (targetPath === normalizePath(options.currentPath)) {
    options.closeMenu();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    return;
  }

  if (prefersReducedMotion()) {
    options.closeMenu();
    options.navigate(to);
    return;
  }

  const target = e.currentTarget;
  const source = target instanceof HTMLElement ? target : null;
  // Capture first: the overlay's close transition moves the tile underneath it.
  const isTile = source?.classList.contains('element-box') ?? false;
  const rect = isTile && source ? source.getBoundingClientRect() : null;

  busy = true;
  options.closeMenu();

  if (source && rect) flight = { clone: makeClone(source, rect), to: targetPath };

  const page = document.getElementById('main');
  if (page) leaveItems(page);

  outTimer = window.setTimeout(() => {
    outTimer = 0;
    options.navigate(to);
  }, OUT_MS);
}
