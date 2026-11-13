import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { HOME_TILES } from '../data/site';
import { NavTile } from '../components/NavTile';
import { Portrait } from '../components/Portrait';
import { SectionTitle } from '../components/SectionTitle';
import { SocialRow } from '../components/SocialRow';
import type { SectionNavHandler } from '../lib/sections';
import { useReveal } from '../hooks/useReveal';
import { prefersReducedMotion } from '../hooks/useScramble';
import '../styles/terminal.css';

export type HelloProps = {
  onNavigate?: SectionNavHandler;
};

const STATUS_TEXT = 'currently: robot learning @ the Safe Robotics Lab';
const TYPE_START_MS = 320;
const TYPE_CHAR_MS = 32;

/**
 * Hero status as a terminal line: types once after a short delay, then the
 * block cursor blinks. The full sentence sits in .sr-only from first paint so
 * assistive tech never receives it character by character; reduced motion
 * skips straight to the finished line with a static cursor.
 */
function HeroStatus() {
  const [reduce] = useState(prefersReducedMotion);
  const [typed, setTyped] = useState(reduce ? STATUS_TEXT.length : 0);
  const done = typed >= STATUS_TEXT.length;

  useEffect(() => {
    if (reduce) return;

    let timer = 0;
    let shown = 0;
    const step = () => {
      shown += 1;
      setTyped(shown);
      if (shown < STATUS_TEXT.length) timer = window.setTimeout(step, TYPE_CHAR_MS);
    };

    timer = window.setTimeout(step, TYPE_START_MS);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  return (
    <p className="hero-status anim">
      <span className="sr-only">{STATUS_TEXT}</span>
      <span aria-hidden="true">{STATUS_TEXT.slice(0, typed)}<span className={done && !reduce ? 'terminal-cursor is-blinking' : 'terminal-cursor'} /></span>
    </p>
  );
}

/** The hero section, first in the stacked single-page document. */
export function Hello({ onNavigate }: HelloProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef);

  /* Same click contract as NavTile: modifiers and non-primary buttons keep the
     browser's link behaviour; plain clicks use the shared section handler. */
  const handleCueClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(e, '/about/');
  };

  return (
    <section
      ref={sectionRef}
      className="section section--home"
      id="hello"
      aria-labelledby="hello-title"
    >
      <div className="container">
        <div className="hero">
          <SectionTitle variant="hero" id="hello-title" text="Hello World..." />

          <div className="hero-intro">
            <Portrait size="sm" />

            <div className="hero-copy">
              <p className="hero-line anim">Shawnak Samaddar — computer science @ Georgia Tech</p>

              <HeroStatus />
            </div>
          </div>

          <hr className="rule" />

          <p className="tile-grid-label anim">// navigate</p>
          <ul className="tile-grid">
            {HOME_TILES.map((tile) => (
              <li className="anim" key={tile.to}>
                <NavTile
                  to={tile.to}
                  abbr={tile.abbr}
                  full={tile.full}
                  icon={tile.icon}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>

          <SocialRow />

          <div className="scroll-cue anim">
            <a
              className="scroll-cue-link"
              href="#/about/"
              aria-label="scroll down to explore"
              onClick={handleCueClick}
            >
              <span className="scroll-cue-pie" aria-hidden="true">
                <span className="scroll-cue-pie-face" />
              </span>
            </a>
            {/* Same words as the link's aria-label: hide the visible copy so
                screen readers announce the cue once, not twice. */}
            <p className="scroll-cue-text" aria-hidden="true">scroll down to explore</p>
          </div>
        </div>
      </div>
    </section>
  );
}
