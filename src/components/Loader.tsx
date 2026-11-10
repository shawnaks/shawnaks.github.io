import { useEffect, useRef, useState } from 'react';

/** Minimum time the loader is shown (vanilla boot: max(0, 1100 - elapsed)). */
const LOADER_MS = 1100;
/** Fade-out duration before the node is removed. */
const FADE_MS = 1100;
/** Module boot timestamp — the closest React analogue to the vanilla `t0`. */
const BOOT_TIME = performance.now();

export type LoaderProps = {
  /** Fires exactly once, when the fade-out starts (body `is-loading` removed). */
  onDone: () => void;
};

/**
 * Boot loader. Adds `is-loading` to <body> while visible, then `is-done` and
 * self-removes after the 1s fade. Keep it mounted until it returns null;
 * unmounting it early also cleans up the body class and cancels the fade.
 */
export function Loader({ onDone }: LoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timers: number[] = [];
    document.body.classList.add('is-loading');

    const elapsed = performance.now() - BOOT_TIME;
    const wait = Math.max(0, LOADER_MS - elapsed);

    timers.push(
      window.setTimeout(() => {
        rootRef.current?.classList.add('is-done');
        document.body.classList.remove('is-loading');

        if (!doneRef.current) {
          doneRef.current = true;
          onDoneRef.current();
        }

        timers.push(window.setTimeout(() => setGone(true), FADE_MS));
      }, wait),
    );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      document.body.classList.remove('is-loading');
    };
  }, []);

  if (gone) return null;

  return (
    <div className="loader" id="loader" aria-hidden="true" ref={rootRef}>
      <svg className="loader-ring" viewBox="0 0 50 50">
        <circle className="loader-circle" cx="25" cy="25" r="20" fill="none" strokeWidth="5" />
      </svg>
    </div>
  );
}
