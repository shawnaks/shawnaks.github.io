import { useEffect } from 'react';
import type { RefObject } from 'react';
import { prefersReducedMotion } from './useScramble';

const REVEAL_BASE = 0.1;
const REVEAL_STEP = 0.06;

/**
 * Scroll-triggered reveal for one section (or page).
 *
 * An IntersectionObserver with the same -100px bottom offset as the skill
 * bars adds `is-entering` to every `.anim` / `.rule` descendant, staggering
 * them by 60ms. When the section leaves the viewport the classes are removed,
 * so scrolling back in replays the reveal. Reduced motion (and browsers
 * without IntersectionObserver) render the final state immediately.
 */
export function useReveal<T extends HTMLElement>(rootRef: RefObject<T | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>('.anim, .rule'));
    if (items.length === 0) return;

    const reduce = prefersReducedMotion();

    const show = () => {
      items.forEach((el, i) => {
        el.style.transitionDelay = `${(REVEAL_BASE + i * REVEAL_STEP).toFixed(2)}s`;
        el.classList.add('is-entering');
      });
    };

    const reset = () => {
      items.forEach((el) => {
        el.classList.remove('is-entering');
        el.style.transitionDelay = '';
      });
    };

    if (reduce || typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => {
        el.style.transitionDelay = '0s';
        el.classList.add('is-entering');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;

        if (entry.isIntersecting) show();
        else reset();
      },
      { threshold: 0, rootMargin: '0px 0px -100px 0px' },
    );

    observer.observe(root);

    return () => observer.disconnect();
  }, [rootRef]);
}
