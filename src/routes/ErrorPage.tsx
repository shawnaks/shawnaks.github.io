import { useRef } from 'react';
import { Cta } from '../components/Cta';
import { SectionTitle } from '../components/SectionTitle';
import type { NavigateHandler } from '../lib/transition';
import { useReveal } from '../hooks/useReveal';

export type ErrorPageProps = {
  onNavigate?: NavigateHandler;
};

/** `*` — the 404 section. */
export function ErrorPage({ onNavigate }: ErrorPageProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="section section--page section--error"
      id="error"
      aria-labelledby="error-title"
    >
      <div className="container">
        <header className="section-head">
          <p className="section-label anim">// 404 — route not found</p>
          <SectionTitle id="error-title" text="not found" tone="error" />
        </header>

        <div className="section-body">
          <p className="section-intro anim">
            The route you requested doesn’t exist (yet) — it may still be on the roadmap.
          </p>

          <p className="cta-row anim">
            <Cta onNavigate={onNavigate} />
          </p>
        </div>
      </div>
    </section>
  );
}
