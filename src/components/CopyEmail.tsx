import { EMAIL } from '../data/site';
import '../styles/toast.css';

/** How long the confirmation stays up before its exit transition. */
const TOAST_MS = 2000;

const COPIED = 'email copied';
const MAIL_APP = 'opening your mail app…';

/** Accessible name shared by both copiers. */
export const COPY_EMAIL_LABEL = `copy email address: ${EMAIL}`;

let toast: HTMLDivElement | null = null;
let hideTimer = 0;

/**
 * One toast for the whole app: the node is created on first use, and every
 * confirmation rewrites it and restarts the timer instead of stacking.
 */
function showToast(text: string): void {
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    // Read the hidden styles back before showing it, so even the first toast
    // fades in instead of popping.
    void toast.offsetWidth;
  }

  const node = toast;
  // Clear first so a repeated click is announced again, not skipped as an
  // unchanged live region.
  node.textContent = '';
  window.requestAnimationFrame(() => {
    node.textContent = text;
  });
  node.classList.add('is-visible');

  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => node.classList.remove('is-visible'), TOAST_MS);
}

/**
 * Copy the site email and confirm it. If the Clipboard API is missing or
 * blocked (insecure context, denied permission), the click still does
 * something: it hands the same link to the mail app.
 */
export async function copyEmail(): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(EMAIL);
    showToast(COPIED);
  } catch {
    showToast(MAIL_APP);
    window.location.href = `mailto:${EMAIL}`;
  }
}
