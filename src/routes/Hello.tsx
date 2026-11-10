import { useRef } from 'react';
import { HOME_TILES } from '../data/site';
import { NavTile } from '../components/NavTile';
import { SectionTitle } from '../components/SectionTitle';
import { SocialRow } from '../components/SocialRow';
import { TransitionLink } from '../components/TransitionLink';
import type { NavigateHandler } from '../lib/transition';
import { revealDelay } from '../lib/transition';
import { useReveal } from '../hooks/useReveal';

export type HelloProps = {
  onNavigate?: NavigateHandler;
};

/** `#/hello/` — the home section, ported from the vanilla `#hello`. */
export function Hello({ onNavigate }: HelloProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef, revealDelay());

  return (
    <section
      ref={sectionRef}
      className="section section--home is-active"
      id="hello"
      aria-labelledby="hello-title"
    >
      <div className="container">
        <div className="hero">
          <SectionTitle variant="hero" id="hello-title" text="Hello World..." />

          <p className="lead anim">
            I’m <strong>Shawnak Samaddar</strong> — a computer science student at{' '}
            <TransitionLink to="/about/" onNavigate={onNavigate}>
              Georgia{'\u00A0'}Tech
            </TransitionLink>{' '}
            in Atlanta, building{' '}
            <TransitionLink to="/projects/" onNavigate={onNavigate}>
              full-stack web apps &amp; machine-learning tools
            </TransitionLink>
            . I like turning real-world problems into working software.
          </p>

          <p className="lead anim">
            These days I’m an undergraduate research assistant at the{' '}
            <TransitionLink to="/experience/" onNavigate={onNavigate}>
              Safe Robotics Lab
            </TransitionLink>
            , teleoperating a bimanual robot and training it to act on its own. Before that: 53M+ records
            through clean pipelines at{' '}
            <TransitionLink to="/experience/" onNavigate={onNavigate}>
              Delta{'\u00A0'}Dental
            </TransitionLink>
            , and gene-expression patterns at{' '}
            <TransitionLink to="/experience/" onNavigate={onNavigate}>
              NASA{'\u00A0'}GeneLab
            </TransitionLink>
            . Off the clock you’ll find me at{' '}
            <TransitionLink to="/experience/" onNavigate={onNavigate}>
              hackathons
            </TransitionLink>{' '}
            — most recently 2nd place at Hacklytics, out of 50+ teams. I’m always looking for the
            next hard problem.
          </p>

          <hr className="rule" />

          <p className="tile-grid-label anim">// navigate</p>
          <ul className="tile-grid">
            {HOME_TILES.map((tile) => (
              <li className="anim" key={tile.to}>
                <NavTile {...tile} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>

          <SocialRow />

          <p className="colophon anim">
            // atlanta, ga · designed &amp; built with react + typescript · © 2026 shawnak
            samaddar
          </p>
        </div>
      </div>
    </section>
  );
}
