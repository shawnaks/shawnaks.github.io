import { useCallback, useEffect, useRef } from 'react';

/** Characters used by the baffle-style scramble (identical to js/main.js). */
export const SCRAMBLE_GLYPHS = '█▓▒░<>/\\|[]{}#@$%&*+=!?';
const GLYPHS = SCRAMBLE_GLYPHS;

const SCRAMBLE_MS = 750;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export type ScrambleFn = (el: HTMLElement | null, duration?: number) => void;
export type CancelScrambleFn = (el?: HTMLElement | null) => void;
export type ResetScrambleFn = (el?: HTMLElement | null) => void;

export type ScrambleControls = {
  scramble: ScrambleFn;
  cancel: CancelScrambleFn;
  /** Restore the settled text, or every `.title-char` to its true glyph. */
  reset: ResetScrambleFn;
};

/**
 * Port of the vanilla `scramble()`. Mutates the element's text, resolving
 * left-to-right over `duration`; a split `.title-text` (one `.title-char` per
 * character) is painted per span instead of as one string. On completion adds
 * `is-glitching` to the closest `.glitch` ancestor. `cancel` stops a running /
 * queued scramble so scroll-away resets can restore the final text. All rAF
 * loops are cancelled on unmount.
 */
export function useScramble(): ScrambleControls {
  const frames = useRef(new Map<HTMLElement, number>());

  const cancel = useCallback<CancelScrambleFn>((el) => {
    if (el) {
      const id = frames.current.get(el);
      if (id !== undefined) cancelAnimationFrame(id);
      frames.current.delete(el);
      return;
    }

    frames.current.forEach((id) => cancelAnimationFrame(id));
    frames.current.clear();
  }, []);

  const reset = useCallback<ResetScrambleFn>((el) => {
    if (!el) return;

    const chars = el.querySelectorAll<HTMLElement>('.title-char');
    if (chars.length > 0) {
      chars.forEach((char) => {
        char.textContent = char.dataset.char ?? '';
      });
      return;
    }

    el.textContent = el.dataset.text ?? '';
  }, []);

  const scramble = useCallback<ScrambleFn>(
    (el, duration = SCRAMBLE_MS) => {
      if (!el) return;

      const text = el.dataset.text ?? el.textContent?.trim() ?? '';
      el.dataset.text = text;

      const pending = frames.current.get(el);
      if (pending !== undefined) {
        cancelAnimationFrame(pending);
        frames.current.delete(el);
      }

      if (prefersReducedMotion()) {
        reset(el);
        return;
      }

      const chars = Array.from(el.querySelectorAll<HTMLElement>('.title-char'));
      const start = performance.now();

      const paint = (settled: number) => {
        if (chars.length > 0) {
          chars.forEach((char, i) => {
            const ch = text[i] ?? '';
            char.textContent =
              ch === ' ' || i < settled ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          });
          return;
        }

        let out = '';
        for (let i = 0; i < text.length; i += 1) {
          const ch = text[i];
          out += ch === ' ' || i < settled ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
      };

      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const settled = Math.floor(p * text.length);

        paint(settled);

        if (p < 1) {
          frames.current.set(el, requestAnimationFrame(tick));
        } else {
          reset(el);
          frames.current.delete(el);
          el.closest('.glitch')?.classList.add('is-glitching');
        }
      };

      frames.current.set(el, requestAnimationFrame(tick));
    },
    [reset],
  );

  useEffect(() => {
    const active = frames.current;
    return () => {
      active.forEach((id) => cancelAnimationFrame(id));
      active.clear();
    };
  }, []);

  return { scramble, cancel, reset };
}
