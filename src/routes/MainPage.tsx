import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { About } from './About';
import { Contact } from './Contact';
import { Experience } from './Experience';
import { Hello } from './Hello';
import { Projects } from './Projects';
import { consumeSectionScroll, scrollToSection } from '../lib/scroll';
import { setActiveSection, canonicalizeSectionHash, startScrollSpy, stopScrollSpy } from '../lib/scrollSpy';
import { sectionIdFromPath } from '../lib/sections';
import type { SectionNavHandler } from '../lib/sections';
import type { NavigateHandler } from '../lib/transition';

export type MainPageProps = {
  /** Section controls scroll (tiles, pills, CTAs, logo). */
  onNavigate?: SectionNavHandler;
  /** Project cards / case-study links keep the route transition. */
  onCaseStudyNavigate?: NavigateHandler;
};

/**
 * The single scrollable document. All five sections stay mounted, so moving
 * between section hashes never replays the loader or loses section state.
 *
 * Deep links and history navigation land instantly; click-scrolls already
 * started their smooth scroll and are skipped here (see `markSectionScroll`).
 */
export function MainPage({ onNavigate, onCaseStudyNavigate }: MainPageProps) {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const id = sectionIdFromPath(pathname);
    if (!id) return;

    if (consumeSectionScroll(pathname)) return;

    scrollToSection(id, 'auto');
    setActiveSection(id);
    // Canonicalise slashed hashes (e.g. #/about → #/about/) without adding a
    // history entry. One active section per URL keeps passive updates stable.
    canonicalizeSectionHash(id);
  }, [pathname]);

  useEffect(() => {
    startScrollSpy();
    return stopScrollSpy;
  }, []);

  return (
    <div className="page-stack">
      <Hello onNavigate={onNavigate} />
      <About onNavigate={onNavigate} />
      <Experience onNavigate={onNavigate} />
      <Projects onNavigate={onCaseStudyNavigate} onSectionNavigate={onNavigate} />
      <Contact onNavigate={onNavigate} />
    </div>
  );
}
