import { useEffect } from 'react';

/** Locks page scroll for a modal; restores the previous inline values on close/unmount. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const body = document.body;
    const root = document.documentElement;
    const previousOverflow = body.style.overflow;
    const previousGutter = root.style.scrollbarGutter;

    body.style.overflow = 'hidden';
    // Reserve the scrollbar gutter so locking does not shift the page.
    root.style.scrollbarGutter = 'stable';

    return () => {
      body.style.overflow = previousOverflow;
      root.style.scrollbarGutter = previousGutter;
    };
  }, [active]);
}
