import type { IconName } from '../data/site';

type IconProps = {
  name: IconName;
};

export function Icon({ name }: IconProps) {
  return (
    <svg className="icon" aria-hidden="true" focusable="false">
      <use href={'#i-' + name} />
    </svg>
  );
}

/** The double-chevron affordance at the end of CTA and next links. */
export function Chevrons({ className = 'cta-icon' }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <Icon name="chev" />
      <Icon name="chev" />
    </span>
  );
}

/** Decorative HUD corner brackets for framed panels and cards. */
export function HudCorners() {
  return (
    <>
      <span className="ui-corner tl" aria-hidden="true" />
      <span className="ui-corner tr" aria-hidden="true" />
      <span className="ui-corner bl" aria-hidden="true" />
      <span className="ui-corner br" aria-hidden="true" />
    </>
  );
}
