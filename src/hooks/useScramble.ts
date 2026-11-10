import { useCallback, useEffect, useRef } from 'react';

/** Characters used by the baffle-style scramble (identical to js/main.js). */
const GLYPHS = '█▓▒░<>/\\|[]{}#@$%&*+=!?';

export const SCRAMBLE_MS = 750;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export type ScrambleFn = (el: HTMLElement | null, duration?: number) => void;

/**
 * Port of the vanilla `scramble()`. Mutates the element's text, resolving
 * left-to-right over `duration`; on completion adds `is-glitching` to the
 * closest `.glitch` ancestor. All rAF loops are cancelled on unmount.
 */
export function useScramble(): ScrambleFn {
  const frames = useRef(new Map<HTMLElement, number>());

  const scramble = useCallback<ScrambleFn>((el, duration = SCRAMBLE_MS) => {
    if (!el) return;

    const text = el.dataset.text ?? el.textContent?.trim() ?? '';
    el.dataset.text = text;

    const pending = frames.current.get(el);
    if (pending !== undefined) {
      cancelAnimationFrame(pending);
      frames.current.delete(el);
    }

    if (prefersReducedMotion()) {
      el.textContent = text;
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const settled = Math.floor(p * text.length);
      let out = '';

      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        out += ch === ' ' || i < settled ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }

      el.textContent = out;

      if (p < 1) {
        frames.current.set(el, requestAnimationFrame(tick));
      } else {
        el.textContent = text;
        frames.current.delete(el);
        el.closest('.glitch')?.classList.add('is-glitching');
      }
    };

    frames.current.set(el, requestAnimationFrame(tick));
  }, []);

  useEffect(() => {
    const active = frames.current;
    return () => {
      active.forEach((id) => cancelAnimationFrame(id));
      active.clear();
    };
  }, []);

  return scramble;
}
