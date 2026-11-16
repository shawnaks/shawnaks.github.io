import { useEffect, useRef, useState } from 'react';
import { copyEmail } from '../lib/copyEmail';

/** How long the envelope reads as a check after a successful copy. */
const CHECK_MS = 1200;

/**
 * Copy the site email and hold `copied` for 1.2s after a success. The mailto
 * fallback is not a copy, so it leaves the icon alone. Repeated clicks restart
 * the same timer; unmount clears it.
 */
export function useEmailCopy(): { copied: boolean; copy: () => Promise<void> } {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    if (!(await copyEmail())) return;
    window.clearTimeout(timer.current);
    setCopied(true);
    timer.current = window.setTimeout(() => setCopied(false), CHECK_MS);
  };

  return { copied, copy };
}
