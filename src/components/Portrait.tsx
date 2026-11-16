import '../styles/portrait.css';

import { HudCorners } from './Icon';

type PortraitProps = {
  /** `sm` for the home intro (~150px), `lg` for the about bio (~300px). */
  size?: 'sm' | 'lg';
  className?: string;
};

/**
 * Framed owner portrait: 3px ink frame, HUD corner brackets that slide in with
 * the page reveal, hatched offset shadow, grayscale until hovered.
 */
export function Portrait({ size = 'sm', className }: PortraitProps) {
  return (
    <figure
      className={['portrait', `portrait--${size}`, 'hatch', 'anim', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="portrait-frame">
        <HudCorners />
        <span className="portrait-media">
          <img
            className="portrait-img"
            src="assets/portrait.jpg"
            alt="Portrait of Shawnak Samaddar"
            width={640}
            height={621}
            decoding="async"
          />
        </span>
      </div>
    </figure>
  );
}
