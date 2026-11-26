import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../hooks/useScramble';

/** The skill stack. Deliberately no percentages. */
const SKILLS = [
  'Python',
  'JavaScript / TypeScript',
  'React & Next.js',
  'Data Engineering (Snowflake, pandas)',
  'FastAPI & Node.js',
  'Machine Learning (PyTorch, TensorFlow)',
  'Java & C/C++',
  'Cloud & DevOps (AWS, Docker)',
] as const;

/**
 * Skill bars that fill to full when they scroll into view. Every bar fills all
 * the way; the growth is the only signal, so the list claims the stack rather
 * than a measured score. Leaving the viewport rewinds the fills and re-entering
 * replays them, matching the section reveals. Reduced motion renders them full
 * immediately.
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
      {SKILLS.map((label) => (
        <li className="skill-bar" key={label}>
          <span className="skill-name skill-name--top">{label}</span>
          <div className="skill-track">
            <div className="skill-fill">
              <span className="skill-name">{label}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
