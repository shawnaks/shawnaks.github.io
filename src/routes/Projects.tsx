import '../styles/projects.css';

import { useRef } from 'react';
import { Cta } from '../components/Cta';
import { Icon } from '../components/Icon';
import { SectionTitle } from '../components/SectionTitle';
import { ShotSlot } from '../components/ShotSlot';
import { TransitionLink } from '../components/TransitionLink';
import { PROJECTS } from '../data/projects';
import type { ProjectData } from '../data/projects';
import type { NavigateHandler } from '../lib/transition';
import type { SectionNavHandler } from '../lib/sections';
import { useReveal } from '../hooks/useReveal';

type ProjectCardProps = {
  project: ProjectData;
  onNavigate?: NavigateHandler;
};

/** One project card: screenshot frame, name, badge, stack, stats, case-study CTA. */
function ProjectCard({ project, onNavigate }: ProjectCardProps) {
  const code = project.links.find((link) => link.label === 'Code') ?? project.links[0];

  return (
    <article className="project-card">
      <ShotSlot alt={`${project.name} — screenshot coming soon`} />

      <div className="project-card-body">
        <div className="project-card-head">
          <h3 className="project-card-name">{project.name}</h3>
          {code ? (
            <a
              className="project-repo"
              href={code.href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`${project.name} source code on GitHub`}
              title={`${project.name} — source`}
            >
              <Icon name="github" />
            </a>
          ) : null}
        </div>

        <p className="project-card-tagline">{project.tagline}</p>

        <p className="project-card-meta">
          <span className="project-card-badge">{project.badge}</span>
          <span className="project-card-date">{project.date}</span>
        </p>

        <p className="project-card-stack">{project.stack.join(' · ')}</p>

        <ul className="project-card-stats">
          {project.stats.map((stat) => (
            <li key={stat.label}>
              <span className="project-stat-value">{stat.value}</span> {stat.label}
            </li>
          ))}
        </ul>

        <TransitionLink
          to={`/case-study/${project.slug}/`}
          className="cta card-cta"
          onNavigate={onNavigate}
        >
          <span className="cta-text">see case study</span>
          <span className="cta-icon" aria-hidden="true">
            <Icon name="chev" />
            <Icon name="chev" />
          </span>
        </TransitionLink>
      </div>
    </article>
  );
}

export type ProjectsProps = {
  /** Case-study links keep the outgoing route transition. */
  onNavigate?: NavigateHandler;
  /** The section CTA scrolls back to hello. */
  onSectionNavigate?: SectionNavHandler;
};

/** The `projects` section: selected work, one card per case study. */
export function Projects({ onNavigate, onSectionNavigate }: ProjectsProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="section section--page"
      id="projects"
      aria-labelledby="projects-title"
    >
      <div className="container">
        <header className="section-head">
          <p className="section-label anim">// ls ./projects</p>
          <SectionTitle id="projects-title" text="projects" letters />
        </header>

        <div className="section-body project-body">
          <p className="section-intro anim">
            Selected work — each project links to a full case study:
          </p>

          <ul className="project-grid">
            {PROJECTS.map((project) => (
              <li className="project-cell anim" key={project.slug}>
                <ProjectCard project={project} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>

          <p className="cta-row anim">
            <Cta onNavigate={onSectionNavigate} />
          </p>
        </div>
      </div>
    </section>
  );
}
