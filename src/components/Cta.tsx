import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export type CtaProps = {
  /** Defaults to the home route. */
  to?: string;
  /** Defaults to the backup's "back to hello". */
  children?: ReactNode;
  className?: string;
  /** Optional page-transition hook (same contract as NavTile). */
  onNavigate?: (e: MouseEvent, to: string) => void;
};

/** The wide bordered CTA link with the double-chevron icon. */
export function Cta({ to = '/hello/', children = 'back to hello', className, onNavigate }: CtaProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(e, to);
  };

  return (
    <Link to={to} className={['cta', className].filter(Boolean).join(' ')} onClick={handleClick}>
      <span className="cta-text">{children}</span>
      <span className="cta-icon" aria-hidden="true">
        <Icon name="chev" />
        <Icon name="chev" />
      </span>
    </Link>
  );
}
