type ScreenshotFrameProps = {
  /** Real capture. Omit for the framed "coming soon" placeholder. */
  src?: string;
  /** Describes the capture (and the placeholder slot) for assistive tech. */
  alt?: string;
  /** `contain` letterboxes portrait captures instead of cropping them. */
  fit?: 'cover' | 'contain';
  /** Intrinsic pixel size, so the browser reserves the right box. */
  width?: number;
  height?: number;
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
 * Image state: desaturated at rest (the monochrome site identity), full colour
 * on hover — or always full colour when there is no hover to reveal it.
 */
export function ScreenshotFrame({
  src,
  alt = '',
  fit,
  width,
  height,
  ratio = 16 / 10,
  className,
}: ScreenshotFrameProps) {
  const label = alt || 'screenshot coming soon';

  return (
    <div
      className={['shot-slot', className].filter(Boolean).join(' ')}
      style={{ aspectRatio: String(ratio) }}
    >
      {src ? (
        <img
          className={'shot-img' + (fit === 'contain' ? ' shot-img--contain' : '')}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="shot-empty" role="img" aria-label={label}>
          <span>// screenshot coming soon</span>
        </div>
      )}
    </div>
  );
}
