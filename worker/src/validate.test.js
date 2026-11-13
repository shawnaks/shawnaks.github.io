import { describe, expect, it } from 'vitest';

import { LIMITS, validateContact } from './validate.js';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'hello',
  message: 'Are you open to internships?',
};

describe('validateContact', () => {
  it('accepts and trims a complete payload', () => {
    const result = validateContact({ ...valid, name: '  Ada  ', message: '  hi  ' });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'hello',
      message: 'hi',
    });
  });

  it('treats the subject as optional', () => {
    expect(validateContact({ ...valid, subject: '   ' }).ok).toBe(true);
    const absent = validateContact({ name: valid.name, email: valid.email, message: valid.message });
    expect(absent.ok).toBe(true);
    expect(absent.value.subject).toBe('');
  });

  it('rejects a missing name, email, or message', () => {
    for (const field of ['name', 'email', 'message']) {
      const result = validateContact({ ...valid, [field]: '  ' });
      expect(result.ok).toBe(false);
      expect(result.errors[field]).toMatch(/required/);
    }
  });

  it('rejects a malformed email', () => {
    for (const email of ['ada', 'ada@', '@example.com', 'ada@example', 'a b@example.com']) {
      const result = validateContact({ ...valid, email });
      expect(result.ok).toBe(false);
      expect(result.errors.email).toMatch(/valid email/);
    }
  });

  it('enforces the same caps as the client', () => {
    const cases = [
      ['name', 'a'.repeat(LIMITS.name + 1)],
      ['email', `${'a'.repeat(LIMITS.email)}@example.com`],
      ['subject', 'a'.repeat(LIMITS.subject + 1)],
      ['message', 'a'.repeat(LIMITS.message + 1)],
    ];
    for (const [field, value] of cases) {
      const result = validateContact({ ...valid, [field]: value });
      expect(result.ok).toBe(false);
      expect(result.errors[field]).toMatch(/characters or fewer/);
    }
  });

  it('accepts values exactly at each cap', () => {
    const result = validateContact({
      ...valid,
      name: 'a'.repeat(LIMITS.name),
      email: `${'a'.repeat(64)}@example.com`,
      subject: 'a'.repeat(LIMITS.subject),
      message: 'a'.repeat(LIMITS.message),
    });
    expect(result.ok).toBe(true);
  });

  it('rejects control characters in single-line fields', () => {
    for (const field of ['name', 'email', 'subject']) {
      const result = validateContact({ ...valid, [field]: `a\u0000b` });
      expect(result.ok).toBe(false);
      expect(result.errors[field]).toMatch(/control characters/);
    }
    // A newline inside a name is just as dangerous: it could add a mail header.
    const injected = validateContact({ ...valid, name: 'Ada\nBcc: victim@example.com' });
    expect(injected.ok).toBe(false);
    expect(injected.errors.name).toMatch(/control characters/);
  });

  it('allows newlines in the message body', () => {
    expect(validateContact({ ...valid, message: 'line one\nline two' }).ok).toBe(true);
  });

  it('rejects a filled honeypot', () => {
    const result = validateContact({ ...valid, company: 'https://spam.example' });
    expect(result.ok).toBe(false);
    expect(result.errors.company).toBeTruthy();
  });

  it('accepts an empty or absent honeypot', () => {
    expect(validateContact({ ...valid, company: '   ' }).ok).toBe(true);
    expect(validateContact(valid).ok).toBe(true);
  });

  it('rejects non-string fields', () => {
    for (const field of ['name', 'email', 'subject', 'message', 'company']) {
      for (const value of [42, null, true, [], {}]) {
        const result = validateContact({ ...valid, [field]: value });
        expect(result.ok).toBe(false);
        expect(result.errors[field]).toMatch(/must be text/);
      }
    }
  });

  it('rejects a non-object body', () => {
    for (const body of [null, undefined, 'hi', 42, true, []]) {
      const result = validateContact(body);
      expect(result.ok).toBe(false);
      expect(result.errors.body).toBeTruthy();
    }
  });
});
