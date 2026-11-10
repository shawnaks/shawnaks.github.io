import { useEffect, useRef } from 'react';
import { prefersReducedMotion, useScramble } from '../hooks/useScramble';

const SLAB_WIPE_MS = 520;
const HERO_DELAY_MS = 60;

export type SectionTitleProps = {
  text: string;
  id?: string;
  /** `slab` is the black-wipe page title; `hero` is the home h1. */
  variant?: 'hero' | 'slab';
  /**
   * Accepted for API symmetry with the error page. It adds nothing itself —
   * the error palette comes from `section--error` on the page wrapper.
   */
  tone?: 'error';
};

/**
 * Section title with the vanilla wipe + scramble choreography.
 * Slab: rAF adds `is-wiping` to the bar, scramble starts after 520ms.
 * Hero: scramble after 60ms. Reduced motion skips the wipe/scramble animation.
 */
export function SectionTitle({ text, id, variant = 'slab' }: SectionTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scramble = useScramble();

  useEffect(() => {
    const title = titleRef.current;
    if (!title) return;

    const textEl = title.querySelector<HTMLElement>('.title-text');
    const bar = title.querySelector<HTMLElement>('.title-bar');
    const reduce = prefersReducedMotion();

    title.focus({ preventScroll: true });

    let raf = 0;
    let timer = 0;

    if (variant === 'slab' && bar && !reduce) {
      raf = requestAnimationFrame(() => bar.classList.add('is-wiping'));
      timer = window.setTimeout(() => scramble(textEl), SLAB_WIPE_MS);
    } else {
      timer = window.setTimeout(() => scramble(textEl), HERO_DELAY_MS);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [variant, text, scramble]);

  if (variant === 'hero') {
    return (
      <h1 ref={titleRef} className="hero-title glitch anim" id={id} tabIndex={-1} data-text={text}>
        <span className="title-text" data-text={text}>
          {text}
        </span>
      </h1>
    );
  }

  return (
    <h2 ref={titleRef} className="section-title glitch" id={id} tabIndex={-1} data-text={text}>
      <span className="title-bar" aria-hidden="true" />
      <span className="title-text" data-text={text}>
        {text}
      </span>
    </h2>
  );
}
