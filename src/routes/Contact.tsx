import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Cta } from '../components/Cta';
import { Icon } from '../components/Icon';
import { SectionTitle } from '../components/SectionTitle';
import type { IconName } from '../data/site';
import { CONTACT, EMAIL, FACTS, GITHUB_URL, LINKEDIN_URL, RESUME_HREF } from '../data/site';
import type { SectionNavHandler } from '../lib/sections';
import {
  CONTACT_LIMITS,
  EMPTY_CONTACT,
  buildMailto,
  validateContact,
} from '../lib/contactForm';
import type { ContactErrors, ContactField, ContactValues } from '../lib/contactForm';
import { createRateLimiter } from '../lib/rateLimit';
import { useReveal } from '../hooks/useReveal';
import '../styles/contact.css';

/** Humans take longer than this to fill a real message; bots do not. */
const MIN_FILL_MS = 3000;

type Notice = { kind: 'success' | 'error' | 'info'; text: string };

type Channel = {
  name: string;
  handle: string;
  description: string;
  icon: IconName;
  href: string;
  external?: boolean;
  download?: boolean;
};

const CHANNELS: readonly Channel[] = [
  {
    name: 'LinkedIn',
    handle: '/in/shawnaksa',
    description: 'Professional background and network.',
    icon: 'linkedin',
    href: LINKEDIN_URL,
    external: true,
  },
  {
    name: 'GitHub',
    handle: '@shawnaks',
    description: 'Code, commits, and project documentation.',
    icon: 'github',
    href: GITHUB_URL,
    external: true,
  },
  {
    name: 'Résumé',
    handle: 'download the pdf',
    description: 'The one-page formal version, always current.',
    icon: 'down',
    href: RESUME_HREF,
    download: true,
  },
];

const MAILTO_SUCCESS = `your mail app should open — if it doesn't, email me directly at ${CONTACT.email}.`;
const SENT_SUCCESS = "message sent — I'll get back to you.";

export type ContactProps = {
  onNavigate?: SectionNavHandler;
};

/** The `contact` section: email-first hero, channel grid, message form, status. */
export function Contact({ onNavigate }: ContactProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstEditAt = useRef<number | null>(null);

  // One limiter for the mount; storage + clock are injectable for tests.
  const [limiter] = useState(() => createRateLimiter());
  const [now, setNow] = useState(() => Date.now());
  const limit = limiter.status(now);

  const [values, setValues] = useState<ContactValues>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useReveal(sectionRef);

  // The countdown ticks only while the form is actually limited.
  useEffect(() => {
    if (limit.allowed) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [limit.allowed]);

  const seconds = Math.max(1, Math.ceil(limit.retryAfterMs / 1000));

  // The limit gets a coarse live-region message (the seconds below it change
  // every tick and would interrupt a screen reader if they were announced).
  const limitNotice: Notice | null = limit.allowed
    ? null
    : {
        kind: 'info',
        text:
          limit.reason === 'window'
            ? "you've reached the limit for now — try again a little later."
            : 'sending is paused for a moment — a recent message just went through.',
      };
  const shownNotice = notice ?? limitNotice;

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = event.target.name as keyof ContactValues;
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    if (field !== 'website') {
      // Bot timing runs from the first real edit, not page mount: a visitor
      // who autofills and submits quickly after a late first keystroke is human.
      firstEditAt.current ??= Date.now();
      setErrors((current) =>
        current[field] ? { ...current, [field]: undefined } : current,
      );
      setNotice((current) => (current?.kind === 'error' ? null : current));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    // A filled honeypot is always a bot: pretend the send worked, do nothing
    // real, and leave no rate-limit timestamp behind.
    if (values.website.trim() !== '') {
      firstEditAt.current = null;
      setValues({ ...EMPTY_CONTACT });
      setErrors({});
      setNotice({ kind: 'success', text: SENT_SUCCESS });
      return;
    }

    const result = validateContact(values);
    setValues(result.values);

    const invalid = Object.keys(result.errors) as ContactField[];
    setErrors(result.errors);
    if (invalid.length > 0) {
      // A form that already failed validation is a human correcting it, not a
      // bot: move the fill timer past the window so the retry is never flagged.
      firstEditAt.current = Date.now() - MIN_FILL_MS;
      setNotice({ kind: 'error', text: 'check the highlighted fields above.' });
      const first = invalid[0];
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      });
      return;
    }

    // Only a complete form can be "too fast": a deep-link visitor who hits
    // send straight away gets the field errors above, not a fake success.
    // Timing runs from the first edit, so a fast submit later in the visit
    // (autofill, paste, a second attempt) still sends normally.
    const firstEdit = firstEditAt.current;
    if (firstEdit !== null && Date.now() - firstEdit < MIN_FILL_MS) {
      firstEditAt.current = null;
      setValues({ ...EMPTY_CONTACT });
      setErrors({});
      setNotice({ kind: 'success', text: SENT_SUCCESS });
      return;
    }

    if (!limit.allowed) {
      setNotice({
        kind: 'info',
        text:
          limit.reason === 'window'
            ? "you've reached the limit for now — try again a little later."
            : 'please wait before sending again — a recent message just went through.',
      });
      return;
    }

    const cleaned = result.values;
    setSending(true);
    setNotice(null);

    try {
      let mailto: string | null = null;

      if (CONTACT.endpoint) {
        // Backend path: `endpoint` is set in src/data/site.ts. Any non-2xx or
        // network rejection falls through to the error message below.
        const response = await fetch(CONTACT.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleaned.name,
            email: cleaned.email,
            subject: cleaned.subject,
            message: cleaned.message,
          }),
          credentials: 'omit',
        });
        if (!response.ok) throw new Error(`contact endpoint returned ${response.status}`);
      } else {
        // Pre-backend path: no endpoint configured, so hand the message to
        // the visitor's mail app. To go live, set CONTACT.endpoint in
        // src/data/site.ts and this branch stops being used.
        mailto = buildMailto(cleaned, CONTACT.email);
      }

      // Record only after a 2xx / successful compose. The timestamp is saved
      // before opening the mailto so the navigation cannot skip it.
      limiter.record();
      setNow(Date.now());
      firstEditAt.current = null;
      setValues({ ...EMPTY_CONTACT });
      setErrors({});
      setNotice({ kind: 'success', text: mailto ? MAILTO_SUCCESS : SENT_SUCCESS });
      if (mailto) window.location.href = mailto;
    } catch {
      // Keep every field exactly as typed so the message is not lost.
      setNotice({
        kind: 'error',
        text: `that didn't send — your message is still here. try again, or email me at ${CONTACT.email}.`,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="section section--page"
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="container">
        <header className="section-head">
          <p className="section-label anim">// say hello</p>
          <SectionTitle id="contact-title" text="contact" letters />
        </header>

        <div className="section-body contact-body">
          <p className="section-intro contact-intro anim">
            All channels are live — reach me directly, any time:
          </p>

          <div className="contact-hero-wrap hatch anim">
            <a className="contact-hero" href={`mailto:${EMAIL}`}>
              <span className="contact-hero-wipe" aria-hidden="true" />
              <span className="contact-hero-icon" aria-hidden="true">
                <Icon name="mail" />
              </span>
              <span className="contact-hero-copy">
                <span className="contact-hero-address">{EMAIL}</span>
                <span className="contact-hero-desc">
                  The fastest way to reach me — for internships, collaborations, or questions.
                </span>
              </span>
              <span className="contact-hero-go" aria-hidden="true">
                <Icon name="chev" />
                <Icon name="chev" />
              </span>
            </a>
          </div>

          <p className="section-label contact-label anim">// channels</p>

          <ul className="contact-channel-grid">
            {CHANNELS.map((channel) => (
              <li className="contact-channel anim" key={channel.name}>
                <a
                  className="contact-channel-link hatch"
                  href={channel.href}
                  target={channel.external ? '_blank' : undefined}
                  rel={channel.external ? 'noopener noreferrer' : undefined}
                  download={channel.download ? '' : undefined}
                >
                  <span className="contact-channel-icon" aria-hidden="true">
                    <Icon name={channel.icon} />
                  </span>
                  <span className="contact-channel-name">{channel.name}</span>
                  <span className="contact-channel-handle">{channel.handle}</span>
                  <span className="contact-channel-desc">{channel.description}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="contact-status hatch anim">
            <div className="contact-status-cell">
              <p className="contact-status-label">// location</p>
              <p className="contact-status-value">atlanta, ga</p>
            </div>
            <div className="contact-status-cell">
              <p className="contact-status-label">// status</p>
              <p className="contact-status-open">
                Open to software engineering &amp; data internships for {FACTS.internshipTerm}.
              </p>
            </div>
          </div>

          <p className="section-label contact-label anim">// send a message</p>

          <form
            ref={formRef}
            className="contact-form hatch anim"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="contact-form-grid">
              <div className="contact-field">
                <label className="contact-field-label" htmlFor="contact-name">
                  name
                </label>
                <input
                  className="contact-input"
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={CONTACT_LIMITS.name}
                  required
                  value={values.name}
                  onChange={handleChange}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                />
                {errors.name ? (
                  <p className="contact-field-error" id="contact-name-error">
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <div className="contact-field">
                <label className="contact-field-label" htmlFor="contact-email">
                  email
                </label>
                <input
                  className="contact-input"
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={CONTACT_LIMITS.email}
                  required
                  value={values.email}
                  onChange={handleChange}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                />
                {errors.email ? (
                  <p className="contact-field-error" id="contact-email-error">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="contact-field contact-field--full">
                <label className="contact-field-label" htmlFor="contact-subject">
                  subject <span className="contact-field-optional">optional</span>
                </label>
                <input
                  className="contact-input"
                  id="contact-subject"
                  name="subject"
                  type="text"
                  autoComplete="off"
                  maxLength={CONTACT_LIMITS.subject}
                  value={values.subject}
                  onChange={handleChange}
                />
              </div>

              <div className="contact-field contact-field--full">
                <label className="contact-field-label" htmlFor="contact-message">
                  message
                </label>
                <textarea
                  className="contact-input contact-textarea"
                  id="contact-message"
                  name="message"
                  rows={6}
                  maxLength={CONTACT_LIMITS.message}
                  required
                  value={values.message}
                  onChange={handleChange}
                  aria-invalid={errors.message ? true : undefined}
                  aria-describedby={
                    errors.message
                      ? 'contact-message-error contact-message-count'
                      : 'contact-message-count'
                  }
                />
                <div className="contact-field-meta">
                  {errors.message ? (
                    <p className="contact-field-error" id="contact-message-error">
                      {errors.message}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="contact-count" id="contact-message-count">
                    {values.message.length} / {CONTACT_LIMITS.message}
                  </span>
                </div>
              </div>
            </div>

            {/* Bots fill every field; people never see this one. */}
            <div className="contact-hp" aria-hidden="true">
              <label htmlFor="contact-website">website</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={values.website}
                onChange={handleChange}
              />
            </div>

            <p
              className={`contact-form-status contact-form-status--${shownNotice?.kind ?? 'idle'}`}
              role="status"
              aria-live="polite"
            >
              {shownNotice?.text ?? ''}
            </p>

            <div className="contact-form-actions">
              <button
                className="cta contact-form-submit"
                type="submit"
                disabled={sending || !limit.allowed}
                aria-describedby={!limit.allowed ? 'contact-form-wait' : undefined}
              >
                <span className="cta-text">
                  {sending ? 'sending…' : limit.allowed ? 'send message' : `wait ${seconds}s`}
                </span>
                <span className="cta-icon" aria-hidden="true">
                  <Icon name="chev" />
                  <Icon name="chev" />
                </span>
              </button>

              {!limit.allowed ? (
                <p className="contact-form-wait" id="contact-form-wait">
                  {limit.reason === 'window'
                    ? `you've reached the limit — try again in ${seconds}s`
                    : `please wait ${seconds}s before sending again`}
                </p>
              ) : null}
            </div>
          </form>

          <p className="cta-row anim">
            <Cta onNavigate={onNavigate} />
          </p>
        </div>
      </div>
    </section>
  );
}
