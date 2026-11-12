import { useRef } from 'react';
import type { MouseEvent } from 'react';
import { FACTS, HOME_TILES } from '../data/site';
import { NavTile } from '../components/NavTile';
import { Portrait } from '../components/Portrait';
import { SectionTitle } from '../components/SectionTitle';
import { SocialRow } from '../components/SocialRow';
import { TransitionLink } from '../components/TransitionLink';
import type { SectionNavHandler } from '../lib/sections';
import { useReveal } from '../hooks/useReveal';

export type HelloProps = {
  onNavigate?: SectionNavHandler;
};

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
                I am currently an undergraduate research assistant at the{' '}
                <TransitionLink to="/experience/" onNavigate={onNavigate}>
                  Safe Robotics Lab
                </TransitionLink>
                , where I teleoperate a bimanual robot and train models for autonomous operation.
                Previously, I engineered data pipelines refining {FACTS.deltaRecords} records at{' '}
                <TransitionLink to="/experience/" onNavigate={onNavigate}>
                  Delta{'\u00A0'}Dental
                </TransitionLink>{' '}
                and analyzed gene-expression patterns at{' '}
                <TransitionLink to="/experience/" onNavigate={onNavigate}>
                  NASA{'\u00A0'}GeneLab
                </TransitionLink>
                . Outside of my studies and research, I compete in{' '}
                <TransitionLink to="/experience/" onNavigate={onNavigate}>
                  hackathons
                </TransitionLink>{' '}
                — most recently earning {FACTS.hackathonPlace} among {FACTS.hackathonTeams} at{' '}
                {FACTS.hackathonName}. I am always looking for the next hard problem.
              </p>
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
              <span className="scroll-cue-pie" aria-hidden="true" />
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
