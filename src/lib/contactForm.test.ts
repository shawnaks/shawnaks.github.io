import { describe, expect, it } from 'vitest';
import {
  CONTACT_LIMITS,
  EMPTY_CONTACT,
  buildMailto,
  cleanContactValues,
  stripLineBreaks,
  validateContact,
} from './contactForm';
import type { ContactValues } from './contactForm';

const VALID: ContactValues = {
  name: 'Shawnak',
  email: 'shawnaksa150@gmail.com',
  subject: 'internship',
  message: 'Hello, I would like to talk about an internship.',
  website: '',
};

describe('validateContact', () => {
  it('accepts a filled form and trims the values', () => {
    const result = validateContact({
      ...VALID,
      name: '  Shawnak  ',
      message: '  hi there  ',
    });
    expect(result.errors).toEqual({});
    expect(result.values.name).toBe('Shawnak');
    expect(result.values.message).toBe('hi there');
  });

  it('requires name, email and message', () => {
    const result = validateContact(EMPTY_CONTACT);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.message).toBeDefined();
    expect(result.errors.subject).toBeUndefined();
  });

  it('accepts plain addresses and rejects shapes without @ or a dot', () => {
    for (const email of ['a@b.co', 'first.last+tag@example.com']) {
      expect(validateContact({ ...VALID, email }).errors.email).toBeUndefined();
    }
    for (const email of ['a@b', 'a b@example.com', 'nope', '@example.com']) {
      expect(validateContact({ ...VALID, email }).errors.email).toBeDefined();
    }
  });

  it('caps every field at the advertised maximum', () => {
    const long = 'x'.repeat(5000);
    const cleaned = cleanContactValues({
      name: long,
      email: `${long}@example.com`,
      subject: long,
      message: long,
      website: '',
    });
    expect(cleaned.name).toHaveLength(CONTACT_LIMITS.name);
    expect(cleaned.email).toHaveLength(CONTACT_LIMITS.email);
    expect(cleaned.subject).toHaveLength(CONTACT_LIMITS.subject);
    expect(cleaned.message).toHaveLength(CONTACT_LIMITS.message);
  });
});

describe('stripLineBreaks', () => {
  it('folds CR/LF into spaces and trims', () => {
    expect(stripLineBreaks('  a\r\nb\nc  ')).toBe('a b c');
    expect(stripLineBreaks('one\rline')).toBe('one line');
  });
});

describe('buildMailto', () => {
  it('encodes the subject and body and targets the configured address', () => {
    const url = buildMailto(VALID, 'shawnaksa150@gmail.com');
    expect(url.startsWith('mailto:shawnaksa150@gmail.com?subject=')).toBe(true);
    expect(url).toContain('subject=internship');
    expect(decodeURIComponent(url)).toContain('name: Shawnak');
    expect(decodeURIComponent(url)).toContain('email: shawnaksa150@gmail.com');
    expect(decodeURIComponent(url)).toContain(VALID.message);
  });

  it('cannot inject extra headers through CR/LF in single-line fields', () => {
    const url = buildMailto(
      {
        ...VALID,
        name: 'a\r\nBcc: evil@example.com',
        email: 'a@b.co\nBcc: evil@example.com',
        subject: 'hi\r\nBcc: evil@example.com',
      },
      'shawnaksa150@gmail.com',
    );
    expect(url).not.toMatch(/[\r\n]/);
    const query = url.slice(url.indexOf('?') + 1);
    const encodedSubject = query.split('&')[0].slice('subject='.length);
    expect(decodeURIComponent(encodedSubject)).toBe(
      'hi Bcc: evil@example.com',
    );
    expect(decodeURIComponent(encodedSubject)).not.toMatch(/[\r\n]/);
    expect(url).toContain(encodeURIComponent('a Bcc: evil@example.com'));
  });

  it('falls back to a default subject when none is given', () => {
    const url = buildMailto({ ...VALID, subject: '' }, 'a@b.co');
    expect(url).toContain(`subject=${encodeURIComponent('message from your site')}`);
  });
});
