import type { ReactNode } from 'react';
import { HudCorners } from './Icon';

export type PlanItemData = {
  /** String or any node — use a node for linked names (`<a>`). */
  name: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
};

type PlanItemProps = PlanItemData & {
  className?: string;
  /** Extra detail rendered after the body (e.g. an achievements list). */
  children?: ReactNode;
};

/** A planned-content card: HUD corner brackets + name / meta / body / detail list. */
export function PlanItem({ name, meta, body, className, children }: PlanItemProps) {
  return (
    <li className={['plan-item', 'hatch', 'anim', className].filter(Boolean).join(' ')}>
      <HudCorners />
      <h3 className="plan-name">{name}</h3>
      {meta != null ? <p className="plan-meta">{meta}</p> : null}
      {body != null ? <p className="plan-body">{body}</p> : null}
      {children}
    </li>
  );
}
