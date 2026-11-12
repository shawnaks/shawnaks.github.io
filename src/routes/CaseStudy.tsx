import '../styles/projects.css';

import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Cta } from '../components/Cta';
import { Icon } from '../components/Icon';
import { SectionTitle } from '../components/SectionTitle';
import { ShotSlot } from '../components/ShotSlot';
import { TransitionLink } from '../components/TransitionLink';
import { getNextProject, getProject } from '../data/projects';
import type { ProjectData } from '../data/projects';
import type { NavigateHandler } from '../lib/transition';
import { useReveal } from '../hooks/useReveal';

export type CaseStudyProps = {
  onNavigate?: NavigateHandler;
};

/** Not-found treatment for an unknown slug. */
function CaseStudyNotFound({ onNavigate }: CaseStudyProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="section section--page section--error"
      id="case-study-not-found"
      aria-labelledby="case-study-not-found-title"
    >
      <div className="container">
        <header className="section-head">
          <p className="section-label anim">// case study not found</p>
          <SectionTitle id="case-study-not-found-title" text="not found" level="h1" />
        </header>

        <div className="section-body">
          <p className="section-intro anim">
            That case study doesn't exist — it may be on the roadmap.
          </p>

          <p className="cta-row anim">
            <Cta to="/projects/" onNavigate={onNavigate}>
              back to projects
            </Cta>
          </p>
        </div>
      </div>
    </section>
  );
}

type CaseStudyViewProps = {
  project: ProjectData;
  onNavigate?: NavigateHandler;
};

/**
 * The full record. Keyed by slug in `CaseStudy`, so moving between studies
 * remounts this view and the reveal observer can stagger the new content in.
 */
function CaseStudyView({ project, onNavigate }: CaseStudyViewProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef);

  const id = `case-study-${project.slug}`;
  const next = getNextProject(project.slug);

  return (
    <section
      ref={sectionRef}
      className="section section--page case-study"
      id={id}
      aria-labelledby={`${id}-title`}
    >
      <div className="container">
        <header className="section-head">
          <p className="section-label anim">// case study: {project.slug}</p>
          <SectionTitle id={`${id}-title`} text={project.name} level="h1" />
        </header>

        <div className="section-body case-body">
          <ShotSlot className="case-shot" alt={`${project.name} — screenshot coming soon`} />

          <div className="case-tldr anim">
            <p className="case-tldr-label">TLDR;</p>
            <p className="case-tldr-text">{project.tldr}</p>
          </div>

          <div className="case-meta anim">
            <div className="case-meta-cell">
              <p className="case-meta-label">// role</p>
              <p className="case-role">{project.role}</p>
            </div>
            <div className="case-meta-cell">
              <p className="case-meta-label">// technology used</p>
              <ul className="case-tech">
                {project.tech.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="case-pairs">
            {project.steps.map((step, i) => (
              <div className="case-pair anim" key={step.challenge}>
                <div className="case-pair-cell">
                  <span className="case-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="case-pair-tag">// challenge</p>
                    <p className="case-pair-text">{step.challenge}</p>
                  </div>
                </div>
                <div className="case-pair-cell">
                  <span className="case-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="case-pair-tag">// solution</p>
                    <p className="case-pair-text">{step.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <ul className="case-stats anim" aria-label={`${project.name} by the numbers`}>
            {project.stats.map((stat) => (
              <li className="case-stat" key={stat.label}>
                <span className="case-stat-value">{stat.value}</span>
                <span className="case-stat-label">{stat.label}</span>
              </li>
            ))}
          </ul>

          <div className="case-links anim">
            {project.links.map((link) => (
              <a
                key={link.label}
                className="case-link"
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noreferrer noopener' : undefined}
              >
                <span className="case-link-icon" aria-hidden="true">
                  <Icon name={link.label === 'Code' ? 'github' : 'chev'} />
                </span>
                <span className="case-link-text">{link.label}</span>
              </a>
            ))}
          </div>

          <nav className="case-pager anim" aria-label="case study navigation">
            <TransitionLink
              to={`/case-study/${next.slug}/`}
              className="case-next"
              onNavigate={onNavigate}
            >
              <span className="case-next-label">next:</span>
              <span className="case-next-name">{next.name}</span>
              <span className="case-next-icon" aria-hidden="true">
                <Icon name="chev" />
                <Icon name="chev" />
              </span>
            </TransitionLink>

            <p className="case-back">
              <TransitionLink to="/projects/" onNavigate={onNavigate}>
                back to listing
              </TransitionLink>
            </p>
          </nav>
        </div>
      </div>
    </section>
  );
}

/** `case-study/:slug` — the full record for one project. */
export function CaseStudy({ onNavigate }: CaseStudyProps) {
  const { slug } = useParams<{ slug: string }>();
  const project = getProject(slug);

  // Page-level title; RouteEffects has already set the generic fallback.
  useEffect(() => {
    document.title = project
      ? `Shawnak Samaddar // ${project.name}`
      : 'Shawnak Samaddar // error';
  }, [project]);

  if (!project) return <CaseStudyNotFound onNavigate={onNavigate} />;

  return <CaseStudyView key={project.slug} project={project} onNavigate={onNavigate} />;
}
