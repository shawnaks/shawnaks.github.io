import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isPlainClick } from '../lib/sections';
import { Chevrons } from './Icon';

type CtaProps = {
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
    if (!onNavigate || !isPlainClick(e)) return;
    e.preventDefault();
    onNavigate(e, to);
  };

  return (
    <Link to={to} className={['cta', className].filter(Boolean).join(' ')} onClick={handleClick}>
      <span className="cta-text">{children}</span>
      <Chevrons />
    </Link>
  );
}
