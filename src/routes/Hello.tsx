import { useRef } from 'react';
import { HOME_TILES } from '../data/site';
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
                Previously, I engineered data pipelines refining 53M+ records at{' '}
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
                — most recently earning 2nd place among 50+ teams at Hacklytics. I am always looking
                for the next hard problem.
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
        </div>
      </div>
    </section>
  );
}
