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
  /** Opens the command palette from the header trigger. */
  onOpenPalette?: () => void;
};

/**
 * Fixed header: logo, compact nav, theme switch. Ports the vanilla scroll
 * logic: dark after 20px, auto-hide on downward scroll past 120px, reveal on
 * scroll-up (±8px).
 */
export function Header({ ready, onNavigate, onOpenPalette }: HeaderProps) {
  // A restored scroll position renders before any scroll event: seed the
  // state from it so the header starts dark (and out of the way when deep).
  const [dark, setDark] = useState(() => window.scrollY > 20);
  const [hidden, setHidden] = useState(() => window.scrollY > window.innerHeight);
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

        <div className="header-actions">
          <button
            className="palette-trigger"
            type="button"
            aria-label="open command palette"
            aria-keyshortcuts="Control+K Meta+K"
            title="command palette (Ctrl+K)"
            onClick={onOpenPalette}
          >
            <span className="palette-trigger-mark" aria-hidden="true">
              //
            </span>
            <span className="palette-trigger-text" aria-hidden="true">
              goto
            </span>
            <kbd className="palette-trigger-kbd" aria-hidden="true">
              ⌘K
            </kbd>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
