import { useEffect, useRef } from 'react';
import { prefersReducedMotion, useScramble } from '../hooks/useScramble';

const SLAB_WIPE_MS = 520;
const HERO_DELAY_MS = 60;

export type SectionTitleProps = {
  text: string;
  id?: string;
  /** `slab` is the black-wipe page title; `hero` is the home h1. */
  variant?: 'hero' | 'slab';
  /** Slab heading level; `h1` where the page has no hero (case study, 404). */
  level?: 'h1' | 'h2';
  /**
   * Accepted for API symmetry with the error page. It adds nothing itself —
   * the error palette comes from `section--error` on the page wrapper.
   */
  tone?: 'error';
};

/**
 * Section title with the vanilla wipe + scramble choreography, triggered when
 * the title scrolls into view (not at page mount — five stacked titles must
 * not all scramble together). Leaving the viewport resets the bar and the
 * text, so re-entering replays wipe + scramble like the reveals.
 * Reduced motion renders the slab immediately.
 */
export function SectionTitle({ text, id, variant = 'slab', level = 'h2' }: SectionTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { scramble, cancel: cancelScramble } = useScramble();

  useEffect(() => {
    const title = titleRef.current;
    if (!title) return;

    const textEl = title.querySelector<HTMLElement>('.title-text');
    const bar = title.querySelector<HTMLElement>('.title-bar');
    const reduce = prefersReducedMotion();

    let raf = 0;
    let timer = 0;
    let entered = false;

    const reset = () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      bar?.classList.remove('is-wiping');
      title.classList.remove('is-glitching');
      cancelScramble(textEl);
      if (textEl) textEl.textContent = text;
    };

    const play = () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      title.classList.remove('is-glitching');
      if (textEl) textEl.textContent = text;

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

    if (reduce || typeof IntersectionObserver === 'undefined') {
      play();
      return () => {
        window.clearTimeout(timer);
        cancelAnimationFrame(raf);
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
      cancelScramble();
    };
  }, [variant, text, scramble, cancelScramble]);

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

  return (
    <Tag ref={titleRef} className="section-title glitch" id={id} tabIndex={-1} data-text={text}>
      <span className="title-bar" aria-hidden="true" />
      <span className="title-text" data-text={text}>
        {text}
      </span>
    </Tag>
  );
}
