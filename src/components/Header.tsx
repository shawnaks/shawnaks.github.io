import type { MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { NAV_ITEMS } from '../data/site';
import { NavTile } from './NavTile';

export type HeaderProps = {
  /** Adds `is-ready`, which runs the post-loader entrance. */
  ready: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  /** Optional page-transition hook forwarded to every nav tile / the logo. */
  onNavigate?: (e: MouseEvent, to: string) => void;
};

/**
 * Fixed header: logo, compact nav, hamburger. Ports the vanilla scroll logic:
 * dark after 20px, auto-hide on downward scroll past 120px, reveal on scroll-up
 * (±8px), and all scroll handling is suspended while the menu is open.
 */
export function Header({ ready, menuOpen, onMenuToggle, onNavigate }: HeaderProps) {
  const [dark, setDark] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      if (menuOpen) return;
      const y = window.scrollY;

      setDark(y > 20);

      if (y > lastY.current + 8 && y > 120) setHidden(true);
      else if (y < lastY.current - 8) setHidden(false);

      lastY.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  // Opening the menu always brings the header back (vanilla setMenu does this).
  // Clearing on the toggle event keeps the effect free of synchronous setState.
  const handleMenuToggle = () => {
    setHidden(false);
    onMenuToggle();
  };

  const handleLogoClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(e, '/hello/');
  };

  const className = ['header', ready ? 'is-ready' : '', dark ? 'is-dark' : '', hidden ? 'is-hidden' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <header className={className} id="header">
      <div className="header-wrap">
        <div className="logo">
          <Link to="/hello/" aria-label="shawnak samaddar — home" onClick={handleLogoClick}>
            <span className="logo-mark" aria-hidden="true">
              //
            </span>
            <span className="logo-text">shawnak{'\u00A0'}samaddar</span>
          </Link>
        </div>

        <nav className="primary-nav" aria-label="primary">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavTile {...item} size="sm" onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </nav>

        <button
          className="menu"
          id="menuBtn"
          type="button"
          aria-label="toggle menu"
          aria-expanded={menuOpen}
          aria-controls="menuOverlay"
          onClick={handleMenuToggle}
        >
          <span className="box tl" />
          <span className="box tr" />
          <span className="box bl" />
          <span className="box br" />
        </button>
      </div>
    </header>
  );
}
