import type { MouseEvent } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
   * When provided, plain left-clicks are intercepted and handed to this
   * callback instead of doing a normal navigation (used for page transitions).
   * Modifier / non-primary clicks are left to the browser.
   */
  onNavigate?: (e: MouseEvent, to: string) => void;
};

/** An `element-box` nav tile, wired to react-router's NavLink for active state. */
export function NavTile({ to, abbr, full, icon, desc, size, onNavigate }: NavTileProps) {
  const { pathname } = useLocation();
  // Case studies live under /case-study/* but belong to the projects section,
  // so keep the projects tile lit while reading one.
  const inCaseStudy = to === '/projects/' && pathname.startsWith('/case-study/');

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(e, to);
  };

  return (
    <NavLink
      to={to}
      data-section={to.replace(/\//g, '')}
      className={({ isActive }) =>
        [
          'element-box',
          size === 'sm' ? 'element-box--sm' : '',
          isActive || inCaseStudy ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' ')
      }
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
    </NavLink>
  );
}
