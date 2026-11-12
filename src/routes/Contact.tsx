import { useRef } from 'react';
import { Cta } from '../components/Cta';
import { Icon } from '../components/Icon';
import { SectionTitle } from '../components/SectionTitle';
import type { IconName } from '../data/site';
import { EMAIL, FACTS, GITHUB_URL, LINKEDIN_URL, RESUME_HREF } from '../data/site';
import type { SectionNavHandler } from '../lib/sections';
import { useReveal } from '../hooks/useReveal';
import '../styles/contact.css';

type Channel = {
  name: string;
  handle: string;
  description: string;
  icon: IconName;
  href: string;
  external?: boolean;
  download?: boolean;
};

const CHANNELS: readonly Channel[] = [
  {
    name: 'LinkedIn',
    handle: '/in/shawnaksa',
    description: 'Professional background and network.',
    icon: 'linkedin',
    href: LINKEDIN_URL,
    external: true,
  },
  {
    name: 'GitHub',
    handle: '@shawnaks',
    description: 'Code, commits, and project documentation.',
    icon: 'github',
    href: GITHUB_URL,
    external: true,
  },
  {
    name: 'Résumé',
    handle: 'download the pdf',
    description: 'The one-page formal version, always current.',
    icon: 'down',
    href: RESUME_HREF,
    download: true,
  },
];

export type ContactProps = {
  onNavigate?: SectionNavHandler;
};

/** The `contact` section: email-first hero, channel grid, location & status. */
export function Contact({ onNavigate }: ContactProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="section section--page"
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="container">
        <header className="section-head">
          <p className="section-label anim">// say hello</p>
          <SectionTitle id="contact-title" text="contact" letters />
        </header>

        <div className="section-body contact-body">
          <p className="section-intro contact-intro anim">
            All channels are live — reach me directly, any time:
          </p>

          <div className="contact-hero-wrap hatch anim">
            <a className="contact-hero" href={`mailto:${EMAIL}`}>
              <span className="contact-hero-wipe" aria-hidden="true" />
              <span className="contact-hero-icon" aria-hidden="true">
                <Icon name="mail" />
              </span>
              <span className="contact-hero-copy">
                <span className="contact-hero-address">{EMAIL}</span>
                <span className="contact-hero-desc">
                  The fastest way to reach me — for internships, collaborations, or questions.
                </span>
              </span>
              <span className="contact-hero-go" aria-hidden="true">
                <Icon name="chev" />
                <Icon name="chev" />
              </span>
            </a>
          </div>

          <p className="section-label contact-label anim">// channels</p>

          <ul className="contact-channel-grid">
            {CHANNELS.map((channel) => (
              <li className="contact-channel anim" key={channel.name}>
                <a
                  className="contact-channel-link hatch"
                  href={channel.href}
                  target={channel.external ? '_blank' : undefined}
                  rel={channel.external ? 'noopener noreferrer' : undefined}
                  download={channel.download ? '' : undefined}
                >
                  <span className="contact-channel-icon" aria-hidden="true">
                    <Icon name={channel.icon} />
                  </span>
                  <span className="contact-channel-name">{channel.name}</span>
                  <span className="contact-channel-handle">{channel.handle}</span>
                  <span className="contact-channel-desc">{channel.description}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="contact-status hatch anim">
            <div className="contact-status-cell">
              <p className="contact-status-label">// location</p>
              <p className="contact-status-value">atlanta, ga</p>
            </div>
            <div className="contact-status-cell">
              <p className="contact-status-label">// status</p>
              <p className="contact-status-open">
                Open to software engineering &amp; data internships for {FACTS.internshipTerm}.
              </p>
            </div>
          </div>

          <p className="cta-row anim">
            <Cta onNavigate={onNavigate} />
          </p>
        </div>
      </div>
    </section>
  );
}
