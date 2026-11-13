import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../data/site';
import { useActiveSection } from '../hooks/useActiveSection';
import { isMainPath, sectionIdFromPath } from '../lib/sections';
import type { SectionNavHandler } from '../lib/sections';
import { Icon } from './Icon';
import '../styles/rail.css';

export type SectionRailProps = {
  /** Same section contract as the header tiles: modifier clicks stay native. */
  onNavigate?: SectionNavHandler;
};

/**
 * Persistent section navigation: a slim fixed left rail in the content gutter
 * on wide screens, a fixed bottom tab bar on phones. Header tiles, this rail
 * and the page all read the one shared scroll-spy store, so no second
 * observer is created here.
 */
export function SectionRail({ onNavigate }: SectionRailProps) {
  const { pathname } = useLocation();
  const activeSection = useActiveSection();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, to: string) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(e, to);
  };

  return (
    <nav className="section-rail" aria-label="Sections">
      <ul className="section-rail-list">
        {NAV_ITEMS.map((item) => {
          const section = sectionIdFromPath(item.to);
          const isActive = isMainPath(pathname) && activeSection === section;
          // Section ids are the canonical names ("hello", not the tile's "home").
          const name = section ?? item.full;

          return (
            <li key={item.to}>
              <Link
                to={item.to}
                data-section={section ?? undefined}
                className={['section-rail-link', isActive ? 'is-active' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-label={name}
                aria-current={isActive ? 'location' : undefined}
                onClick={(e) => handleClick(e, item.to)}
              >
                <span className="section-rail-mark" aria-hidden="true" />
                <span className="section-rail-label" aria-hidden="true">{`// ${name}`}</span>
                <span className="section-rail-icon" aria-hidden="true">
                  <Icon name={item.icon} />
                </span>
                <span className="section-rail-abbr" aria-hidden="true">
                  {item.abbr}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
