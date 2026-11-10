import type { MouseEvent } from 'react';
import { useEffect } from 'react';
import { NAV_ITEMS } from '../data/site';
import { NavTile } from './NavTile';

export type MenuOverlayProps = {
  menuOpen: boolean;
  onClose: () => void;
  /** Optional page-transition hook forwarded to the large tiles. */
  onNavigate?: (e: MouseEvent, to: string) => void;
};

/**
 * Fullscreen tile menu. The CSS is driven by `body.menu-open`, so the effect
 * keeps that class in sync (and always removes it on cleanup).
 */
export function MenuOverlay({ menuOpen, onClose, onNavigate }: MenuOverlayProps) {
  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, onClose]);

  // Backdrop clicks close (vanilla: anything that isn't a nav tile). A tile
  // click also dismisses the menu, exactly like the vanilla setMenu(false).
  const handleClick = () => {
    onClose();
  };

  // Only override NavLink navigation when a real transition handler exists;
  // otherwise the plain NavLink click must still navigate.
  const handleNavigate = onNavigate
    ? (e: MouseEvent, to: string) => {
        onClose();
        onNavigate(e, to);
      }
    : undefined;

  return (
    <div className="menu-overlay" id="menuOverlay" aria-hidden={!menuOpen} onClick={handleClick}>
      <nav className="menu-nav" aria-label="menu">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavTile {...item} onNavigate={handleNavigate} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
