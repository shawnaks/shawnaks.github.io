import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { prefersReducedMotion } from '../hooks/useScramble';

/** label — relative fill width. Deliberately no percentage claim. */
const SKILLS = [
  { label: 'Python', percent: 90 },
  { label: 'JavaScript / TypeScript', percent: 85 },
  { label: 'React & Next.js', percent: 85 },
  { label: 'Data Engineering (Snowflake, pandas)', percent: 85 },
  { label: 'FastAPI & Node.js', percent: 80 },
  { label: 'Machine Learning (PyTorch, TensorFlow)', percent: 80 },
  { label: 'Java & C/C++', percent: 75 },
  { label: 'Cloud & DevOps (AWS, Docker)', percent: 75 },
] as const;

/**
 * Scroll-triggered skill bars. An IntersectionObserver (with a -100px bottom
 * offset) adds `is-live`, which CSS uses to transition every fill from 0 to
 * its `--pct`. Leaving the viewport resets the fills so re-entering replays
 * the grow. Reduced motion renders the final state immediately.
 *
 * The bars carry no numbers: the length is emphasis, not a measured score.
 */
export function SkillBars() {
  const rootRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (prefersReducedMotion()) {
      root.classList.add('is-live');
      return;
    }

    const reset = () => {
      root.classList.remove('is-live');
      root.classList.add('is-resetting');
    };

    const play = () => {
      // Replay always starts from zero, even if a reset is mid-flight.
      root.classList.remove('is-live');
      root.classList.add('is-resetting');

      // Commit the zero-width state (transition disabled) before growing again.
      void root.offsetWidth;

      root.classList.remove('is-resetting');
      root.classList.add('is-live');
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
      root.classList.remove('is-live');
      root.classList.remove('is-resetting');
    };
  }, []);

  return (
    <ul className="skill-bars hatch anim" ref={rootRef}>
      {SKILLS.map((skill) => (
        <li
          className="skill-bar"
          key={skill.label}
          style={{ '--pct': `${skill.percent}%` } as CSSProperties}
        >
          <span className="skill-name skill-name--top">{skill.label}</span>
          <div className="skill-track">
            <div className="skill-fill">
              <span className="skill-name">{skill.label}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
