export type ShotSlotProps = {
  /** Real capture. Omit for the framed "coming soon" placeholder. */
  src?: string;
  /** Describes the capture (and the placeholder slot) for assistive tech. */
  alt?: string;
  /** Width ÷ height. Defaults to 16 / 10. */
  ratio?: number;
  className?: string;
};

/**
 * Screenshot frame for project cards and case-study headers.
 *
 * Empty state: the deliberate placeholder the owner replaces later — a framed
 * hatched area with a `// screenshot coming soon` label.
 *
 * Image state: the reference site's treatment — desaturated at 25% opacity,
 * full colour on hover (the CSS is ready; no usage yet).
 */
export function ShotSlot({ src, alt = '', ratio = 16 / 10, className }: ShotSlotProps) {
  const label = alt || 'screenshot coming soon';

  return (
    <div
      className={['shot-slot', className].filter(Boolean).join(' ')}
      style={{ aspectRatio: String(ratio) }}
    >
      {src ? (
        <img className="shot-img" src={src} alt={alt} loading="lazy" />
      ) : (
        <div className="shot-empty" role="img" aria-label={label}>
          <span>// screenshot coming soon</span>
        </div>
      )}
    </div>
  );
}
