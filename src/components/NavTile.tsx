import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useActiveSection } from '../hooks/useActiveSection';
import { isCaseStudyPath, isMainPath } from '../lib/sections';
import type { SectionId } from '../lib/sections';
import { Icon } from './Icon';

export type NavTileProps = {
  to: string;
  abbr: string;
  full: string;
  icon: string;
  /** Home-grid only: the descriptive line under the box text. */
  desc?: string;
  /** `sm` is the compact header variant. */
  size?: 'sm';
  /**
   * Section control: plain left-clicks are intercepted and handed to the
   * shared scroll handler. Modifier / non-primary clicks keep the browser's
   * normal link behaviour.
   */
  onNavigate?: (e: MouseEvent, to: string) => void;
};

/**
 * An `element-box` nav tile. Active state comes from the shared scroll-spy
 * store (passive scrolling updates it without touching the router), not from
 * the router location. Case studies still light the projects tile.
 */
export function NavTile({ to, abbr, full, icon, desc, size, onNavigate }: NavTileProps) {
  const { pathname } = useLocation();
  const activeSection = useActiveSection();
  const section = to.replace(/\//g, '') as SectionId;

  const inCaseStudy = section === 'projects' && isCaseStudyPath(pathname);
  const isActive = inCaseStudy || (isMainPath(pathname) && activeSection === section);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(e, to);
  };

  return (
    <Link
      to={to}
      data-section={section}
      aria-current={isActive ? 'location' : undefined}
      className={['element-box', size === 'sm' ? 'element-box--sm' : '', isActive ? 'is-active' : '']
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
    >
      <span className="box-text">
        <span className="abbr">{abbr}</span>
        <span className="full">{full}</span>
      </span>
      {desc ? <span className="box-desc">{desc}</span> : null}
      <span className="box-icon">
        <Icon name={icon} />
      </span>
    </Link>
  );
}
