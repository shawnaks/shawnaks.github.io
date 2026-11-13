import '../styles/resume-preview.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RESUME_HREF } from '../data/site';

/** Any trigger can open the preview without prop drilling. */
export const RESUME_PREVIEW_EVENT = 'resume:preview';

export function openResumePreview() {
  window.dispatchEvent(new Event(RESUME_PREVIEW_EVENT));
}

const TITLE_ID = 'resume-preview-title';
const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * Résumé dialog: the PDF inline with download / new-tab escape hatches in the
 * bar and in the footer strip, which stays visible when a browser refuses to
 * render the frame. Mounted once; opened by RESUME_PREVIEW_EVENT.
 */
export function ResumePreview() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    const opener = openerRef.current;
    openerRef.current = null;
    setOpen(false);
    if (opener) window.requestAnimationFrame(() => opener.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    const onOpen = () => {
      // A second dispatch while open must not steal focus from the dialog.
      if (panelRef.current) return;
      const current = document.activeElement;
      openerRef.current =
        current instanceof HTMLElement && current !== document.body ? current : null;
      setOpen(true);
    };

    window.addEventListener(RESUME_PREVIEW_EVENT, onOpen);
    return () => window.removeEventListener(RESUME_PREVIEW_EVENT, onOpen);
  }, []);

  // Scroll lock + focus in, mirroring the palette's scrollbar-gutter trick.
  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const root = document.documentElement;
    const previousOverflow = body.style.overflow;
    const previousGutter = root.style.scrollbarGutter;

    body.style.overflow = 'hidden';
    root.style.scrollbarGutter = 'stable';
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      body.style.overflow = previousOverflow;
      root.style.scrollbarGutter = previousGutter;
    };
  }, [open]);

  // Esc closes; Tab cycles the dialog's own controls (the frame is not tabbable).
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => !element.hasAttribute('aria-hidden'),
      );
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="resume-preview-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        className="resume-preview-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
      >
        <div className="resume-preview-bar">
          <h2 className="resume-preview-title" id={TITLE_ID}>
            <span className="resume-preview-mark" aria-hidden="true">
              {'// '}
            </span>
            résumé
          </h2>
          <div className="resume-preview-actions">
            <a className="resume-preview-action" href={RESUME_HREF} download>
              download
            </a>
            <a
              className="resume-preview-action"
              href={RESUME_HREF}
              target="_blank"
              rel="noopener"
            >
              open in new tab
            </a>
          </div>
          <button
            ref={closeRef}
            className="resume-preview-close"
            type="button"
            aria-label="close résumé preview"
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="resume-preview-sheet">
          <iframe
            className="resume-preview-frame"
            src={RESUME_HREF}
            title="Shawnak Samaddar résumé (PDF)"
            tabIndex={-1}
          />
        </div>

        <p className="resume-preview-fallback">
          PDF not showing?{' '}
          <a href={RESUME_HREF} download>
            download the file
          </a>{' '}
          or{' '}
          <a href={RESUME_HREF} target="_blank" rel="noopener">
            open it in a new tab
          </a>
          .
        </p>
      </div>
    </div>
  );
}
