import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type TransitionLinkProps = {
  to: string;
  children: ReactNode;
  className?: string;
  /** Page-transition hook. Without it this behaves exactly like `<Link>`. */
  onNavigate?: (e: MouseEvent, to: string) => void;
};

/**
 * `Link` with the same interception contract as NavTile/Cta — used by the
 * inline pill links so they get the outgoing animation too (no clone; they
 * are not tiles, matching the vanilla behaviour).
 */
export function TransitionLink({ to, children, className, onNavigate }: TransitionLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(e, to);
  };

  return (
    <Link to={to} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
