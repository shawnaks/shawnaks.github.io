import { useEffect } from 'react';
import type { RefObject } from 'react';

const REVEAL_BASE = 0.1;
const REVEAL_STEP = 0.06;

/**
 * Port of the vanilla `enterItems()`: stagger every `.anim` / `.rule`
 * descendant in by 60ms and add `is-entering` (the CSS drives the rest).
 * Adding a class twice is harmless, so a StrictMode double-mount is safe.
 *
 * `delayMs` lets a page that is being landed on hold its content back until
 * the flying tile clone has reached the title (vanilla waits ~700ms).
 */
export function useReveal<T extends HTMLElement>(rootRef: RefObject<T | null>, delayMs = 0): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const start = () => {
      const items = Array.from(root.querySelectorAll<HTMLElement>('.anim, .rule'));

      items.forEach((el, i) => {
        el.style.transitionDelay = `${(REVEAL_BASE + i * REVEAL_STEP).toFixed(2)}s`;
        el.classList.add('is-entering');
      });
    };

    if (delayMs <= 0) {
      start();
      return;
    }

    const timer = window.setTimeout(start, delayMs);
    return () => window.clearTimeout(timer);
  }, [rootRef, delayMs]);
}
