import type { ReactNode } from 'react';
import { PlanItem } from './PlanItem';
import type { PlanItemData } from './PlanItem';

export type PlanListProps = {
  /** Data-driven items; omit and pass children for fully custom lists. */
  items?: readonly PlanItemData[];
  children?: ReactNode;
  className?: string;
};

export function PlanList({ items, children, className }: PlanListProps) {
  return (
    <ul className={['plan-list', className].filter(Boolean).join(' ')}>
      {items?.map((item, i) => (
        <PlanItem key={i} {...item} />
      ))}
      {children}
    </ul>
  );
}
