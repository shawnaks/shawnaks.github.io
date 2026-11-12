import { useEffect, useRef } from 'react';
import { prefersReducedMotion, SCRAMBLE_GLYPHS, useScramble } from '../hooks/useScramble';

const SLAB_WIPE_MS = 520;
const HERO_DELAY_MS = 60;
const HOVER_GLYPH_MS = 60;

export type SectionTitleProps = {
  text: string;
  id?: string;
  /** `slab` is the black-wipe page title; `hero` is the home h1. */
  variant?: 'hero' | 'slab';
  /** Slab heading level; `h1` where the page has no hero (case study, 404). */
  level?: 'h1' | 'h2';
  /** Split slab text into per-character spans for the hover cycle. */
  letters?: boolean;
};

/**
 * Section title with the vanilla wipe + scramble choreography, triggered when
 * the title scrolls into view (not at page mount — five stacked titles must
 * not all scramble together). Leaving the viewport resets the bar and the
 * text, so re-entering replays wipe + scramble like the reveals.
 * With `letters`, the settled title also cycles a single glyph while hovered.
 * Reduced motion renders the slab immediately and ignores hover.
 */
export function SectionTitle({
  text,
  id,
  variant = 'slab',
  level = 'h2',
  letters = false,
}: SectionTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { scramble, cancel: cancelScramble, reset: resetScramble } = useScramble();

  useEffect(() => {
    const title = titleRef.current;
    if (!title) return;

    const textEl = title.querySelector<HTMLElement>('.title-text');
    const bar = title.querySelector<HTMLElement>('.title-bar');
    const reduce = prefersReducedMotion();

    let raf = 0;
    let timer = 0;
    let entered = false;
    let hovered: HTMLElement | null = null;
    let cycleRaf = 0;

    const stopCycle = () => {
      cancelAnimationFrame(cycleRaf);
      cycleRaf = 0;
      if (hovered) hovered.textContent = hovered.dataset.char ?? '';
      hovered = null;
    };

    // Entry is driven by real pointer motion: Chrome replays `pointerover` on a
    // span whose text mutates, which would start the cycle after a scramble.
    const onPointerMove = (event: PointerEvent) => {
      if (reduce || !title.classList.contains('is-glitching')) return;
      const char = (event.target as Element | null)?.closest<HTMLElement>('.title-char');
      if (!char || char === hovered || !textEl?.contains(char)) return;

      stopCycle();
      hovered = char;

      let last = 0;
      const tick = (now: number) => {
        if (!hovered) return;
        // Recover if `pointerout` was missed (e.g. the page scrolled under the
        // pointer): the letter must not keep cycling once it is not hovered.
        if (!hovered.matches(':hover')) {
          stopCycle();
          return;
        }
        if (now - last >= HOVER_GLYPH_MS) {
          last = now;
          hovered.textContent = SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
        }
        cycleRaf = requestAnimationFrame(tick);
      };
      cycleRaf = requestAnimationFrame(tick);
    };

    const onPointerOut = (event: PointerEvent) => {
      const char = (event.target as Element | null)?.closest<HTMLElement>('.title-char');
      if (char && char === hovered) stopCycle();
    };

    const reset = () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      stopCycle();
      bar?.classList.remove('is-wiping');
      title.classList.remove('is-glitching');
      cancelScramble(textEl);
      resetScramble(textEl);
    };

    const play = () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      stopCycle();
      title.classList.remove('is-glitching');
      resetScramble(textEl);

      if (variant === 'slab' && bar) {
        bar.classList.remove('is-wiping');

        if (reduce) {
          bar.classList.add('is-wiping');
        } else {
          // Force the reset width to commit before transitioning to 100%.
          void bar.offsetWidth;
          raf = requestAnimationFrame(() => bar.classList.add('is-wiping'));
        }
      }

      if (reduce) return;

      const delay = variant === 'slab' ? SLAB_WIPE_MS : HERO_DELAY_MS;
      timer = window.setTimeout(() => scramble(textEl), delay);
    };

    if (letters && variant === 'slab' && textEl) {
      textEl.addEventListener('pointermove', onPointerMove);
      textEl.addEventListener('pointerout', onPointerOut);
    }

    if (reduce || typeof IntersectionObserver === 'undefined') {
      play();
      return () => {
        window.clearTimeout(timer);
        cancelAnimationFrame(raf);
        stopCycle();
        textEl?.removeEventListener('pointermove', onPointerMove);
        textEl?.removeEventListener('pointerout', onPointerOut);
        cancelScramble();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;

        if (entry.isIntersecting) {
          if (!entered) {
            entered = true;
            play();
          }
        } else if (entered) {
          entered = false;
          reset();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -100px 0px' },
    );

    observer.observe(title);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      stopCycle();
      textEl?.removeEventListener('pointermove', onPointerMove);
      textEl?.removeEventListener('pointerout', onPointerOut);
      cancelScramble();
    };
  }, [variant, text, letters, scramble, cancelScramble, resetScramble]);

  if (variant === 'hero') {
    return (
      <h1 ref={titleRef} className="hero-title glitch anim" id={id} tabIndex={-1} data-text={text}>
        <span className="title-text" data-text={text}>
          {text}
        </span>
      </h1>
    );
  }

  const Tag = level;

  // Split letters are announced one by one; keep the heading's name whole.
  return (
    <Tag
      ref={titleRef}
      className="section-title glitch"
      id={id}
      tabIndex={-1}
      data-text={text}
      aria-label={letters ? text : undefined}
    >
      <span className="title-bar" aria-hidden="true" />
      <span className="title-text" data-text={text}>
        {letters
          ? Array.from(text).map((ch, index) => (
              <span className="title-char" data-char={ch} key={index}>
                {ch}
              </span>
            ))
          : text}
      </span>
    </Tag>
  );
}
