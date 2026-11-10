import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

/** label — percent, in display order. */
const SKILLS = [
  { label: 'Python', percent: 90 },
  { label: 'JavaScript / TypeScript', percent: 85 },
  { label: 'React & Next.js', percent: 85 },
  { label: 'Data Engineering (Snowflake, Pandas)', percent: 85 },
  { label: 'FastAPI & Node.js', percent: 80 },
  { label: 'Machine Learning (PyTorch, TensorFlow)', percent: 80 },
  { label: 'Java & C/C++', percent: 75 },
  { label: 'Cloud & DevOps (AWS, Docker)', percent: 75 },
] as const;

/** Matches the CSS width transition on `.skill-fill`. */
const GROW_MS = 1500;

/** Expo-out, close to the CSS `--ease` curve. */
function easeOut(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

/**
 * Scroll-triggered skill bars, ported from the reference site.
 *
 * An IntersectionObserver (with a -100px bottom offset) adds `is-live`, which
 * CSS uses to transition every fill from 0 to its `--pct`. A rAF loop counts
 * each number from 0 to its percent over the same 1.5s. Leaving the viewport
 * resets both, so re-entering replays the whole effect. Reduced motion skips
 * the observer and renders the final state immediately.
 */
export function SkillBars() {
  const rootRef = useRef<HTMLUListElement>(null);
  const numberRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const numbers = numberRefs.current;

    const setNumbers = (progress: number) => {
      SKILLS.forEach((skill, i) => {
        const el = numbers[i];
        if (el) el.textContent = String(Math.round(skill.percent * progress));
      });
    };

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setNumbers(1);
      root.classList.add('is-live');
      return;
    }

    let raf = 0;

    const reset = () => {
      cancelAnimationFrame(raf);
      root.classList.remove('is-live');
      root.classList.add('is-resetting');
      setNumbers(0);
    };

    const play = () => {
      cancelAnimationFrame(raf);
      // Replay always starts from zero, even if a reset transition is mid-flight.
      root.classList.remove('is-live');
      root.classList.add('is-resetting');
      setNumbers(0);

      // Commit the zero-width state (transition disabled) before growing again.
      void root.offsetWidth;

      root.classList.remove('is-resetting');
      root.classList.add('is-live');

      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / GROW_MS);
        setNumbers(easeOut(t));
        if (t < 1) raf = requestAnimationFrame(tick);
        else setNumbers(1);
      };

      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) play();
        else reset();
      },
      { threshold: 0.15, rootMargin: '0px 0px -100px 0px' },
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      root.classList.remove('is-live');
      root.classList.remove('is-resetting');
    };
  }, []);

  return (
    <ul className="skill-bars hatch anim" ref={rootRef}>
      {SKILLS.map((skill, i) => (
        <li
          className="skill-bar"
          key={skill.label}
          data-percent={skill.percent}
          style={{ '--pct': `${skill.percent}%` } as CSSProperties}
        >
          <span className="skill-name skill-name--top" aria-hidden="true">
            {skill.label}
          </span>
          <div
            className="skill-track"
            role="progressbar"
            aria-label={skill.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={skill.percent}
          >
            <div className="skill-fill">
              <span className="skill-name">{skill.label}</span>
            </div>
          </div>
          <span
            className="skill-num"
            aria-hidden="true"
            ref={(el) => {
              numberRefs.current[i] = el;
            }}
          >
            0
          </span>
        </li>
      ))}
    </ul>
  );
}
