/* ==========================================================================
   contact payload validation — pure, no Workers imports
   Limits mirror src/lib/contactForm.ts so the client and the worker agree.
   ========================================================================== */

export const LIMITS = {
  name: 80,
  email: 254,
  subject: 120,
  message: 2000,
};

// Deliberately permissive: shape only, no RFC 5322 homework.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// C0 controls plus DEL. Only single-line fields are checked with this; the
// message is body text and never becomes a mail header.
// eslint-disable-next-line no-control-regex -- rejecting control characters is the point
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

const FIELDS = ['name', 'email', 'subject', 'message', 'company'];

function line(raw, field, max, required, errors) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) {
    if (required) errors[field] = `${field} is required.`;
    return '';
  }
  if (CONTROL_RE.test(value)) {
    errors[field] = `${field} contains control characters.`;
    return '';
  }
  if (value.length > max) {
    errors[field] = `${field} must be ${max} characters or fewer.`;
    return '';
  }
  return value;
}

/**
 * Validate a parsed JSON body.
 * Returns `{ ok: true, value }` or `{ ok: false, errors }`; never throws.
 */
export function validateContact(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: { body: 'expected a JSON object.' } };
  }

  const errors = {};
  for (const field of FIELDS) {
    const raw = input[field];
    if (raw !== undefined && typeof raw !== 'string') {
      errors[field] = `${field} must be text.`;
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const name = line(input.name, 'name', LIMITS.name, true, errors);
  const email = line(input.email, 'email', LIMITS.email, true, errors);
  if (email && !EMAIL_RE.test(email)) errors.email = 'enter a valid email address.';
  const subject = line(input.subject, 'subject', LIMITS.subject, false, errors);
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (!message) errors.message = 'message is required.';
  else if (message.length > LIMITS.message) {
    errors.message = `message must be ${LIMITS.message} characters or fewer.`;
  }

  // Honeypot: humans never see this field, so anything in it is a bot.
  if ((typeof input.company === 'string' ? input.company : '').trim() !== '') {
    errors.company = 'unexpected field.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, email, subject, message } };
}
