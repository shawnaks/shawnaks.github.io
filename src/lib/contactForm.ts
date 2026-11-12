/* ==========================================================================
   contact form — pure validation + mailto composition
   Kept out of the component so the field rules and header sanitising can be
   tested with vitest. No React, no DOM.
   ========================================================================== */

export const CONTACT_LIMITS = {
  name: 80,
  email: 254,
  subject: 120,
  message: 2000,
} as const;

export type ContactField = keyof typeof CONTACT_LIMITS;

export type ContactValues = Record<ContactField, string> & {
  /** Honeypot: bots fill it, humans never see it. */
  website: string;
};

export type ContactErrors = Partial<Record<ContactField, string>>;

export const EMPTY_CONTACT: ContactValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
};

// Deliberately permissive: shape only, no RFC 5322 homework.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim and fold CR/LF so a single-line value cannot add mailto headers. */
export function stripLineBreaks(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/** Trim every field and enforce the caps the inputs advertise. */
export function cleanContactValues(values: ContactValues): ContactValues {
  return {
    name: stripLineBreaks(values.name).slice(0, CONTACT_LIMITS.name),
    email: stripLineBreaks(values.email).slice(0, CONTACT_LIMITS.email),
    subject: stripLineBreaks(values.subject).slice(0, CONTACT_LIMITS.subject),
    message: values.message.trim().slice(0, CONTACT_LIMITS.message),
    website: values.website,
  };
}

export function validateContact(values: ContactValues): {
  values: ContactValues;
  errors: ContactErrors;
} {
  const cleaned = cleanContactValues(values);
  const errors: ContactErrors = {};

  if (!cleaned.name) errors.name = 'name is required.';
  if (!cleaned.email) errors.email = 'email is required.';
  else if (!EMAIL_RE.test(cleaned.email)) errors.email = 'enter a valid email address.';
  if (!cleaned.message) errors.message = 'message is required.';

  return { values: cleaned, errors };
}

export type MailtoValues = Pick<ContactValues, 'name' | 'email' | 'subject' | 'message'>;

/**
 * Build the pre-backend `mailto:` link. Everything user-typed is encoded, and
 * the single-line headers are stripped again here so the helper is safe even
 * when called without validateContact.
 */
export function buildMailto(values: MailtoValues, to: string): string {
  const subject = stripLineBreaks(values.subject) || 'message from your site';
  const body = [
    `name: ${stripLineBreaks(values.name)}`,
    `email: ${stripLineBreaks(values.email)}`,
    '',
    values.message,
  ].join('\n');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
