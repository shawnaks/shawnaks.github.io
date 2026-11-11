import type { MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { NAV_ITEMS } from '../data/site';
import { isProgrammaticScroll } from '../lib/scroll';
import { NavTile } from './NavTile';
import { ThemeToggle } from './ThemeToggle';

export type HeaderProps = {
  /** Adds `is-ready`, which runs the post-loader entrance. */
  ready: boolean;
  /** Optional page-transition hook forwarded to every nav tile / the logo. */
  onNavigate?: (e: MouseEvent, to: string) => void;
};

/**
 * Fixed header: logo, compact nav, theme switch. Ports the vanilla scroll
 * logic: dark after 20px, auto-hide on downward scroll past 120px, reveal on
 * scroll-up (±8px).
 */
export function Header({ ready, onNavigate }: HeaderProps) {
  const [dark, setDark] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;

      setDark(y > 20);

      // Section landings and history restorations are programmatic: keep the
      // header on screen instead of treating the jump as a user scrolling
      // down past the hero. A single scroll event that moves more than one
      // viewport is always a jump, never a wheel/trackpad gesture.
      const delta = y - lastY.current;
      if (isProgrammaticScroll() || Math.abs(delta) > window.innerHeight) {
        setHidden(false);
        lastY.current = y;
        return;
      }

      if (y > lastY.current + 8 && y > 120) setHidden(true);
      else if (y < lastY.current - 8) setHidden(false);

      lastY.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

        <ThemeToggle />
      </div>
    </header>
  );
}
