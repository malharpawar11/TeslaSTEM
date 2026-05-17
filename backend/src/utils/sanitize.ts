// Strip control + zero-width chars and clamp length. We do NOT strip HTML here —
// the mobile client renders plain text and Prisma's parameterized queries already
// neutralise SQL injection. XSS prevention belongs in the consumer.

// C0 controls (0x00-0x1F except tab/newline/CR), DEL (0x7F), C1 controls,
// zero-width space/joiner/non-joiner, BOM, bidi overrides.
const CONTROL_AND_ZW = new RegExp(
  '[' +
    '\\u0000-\\u0008' +
    '\\u000B\\u000C' +
    '\\u000E-\\u001F' +
    '\\u007F-\\u009F' +
    '\\u200B-\\u200F' +
    '\\u202A-\\u202E' +
    '\\u2060-\\u206F' +
    '\\uFEFF' +
    ']',
  'g',
);

export function sanitizeText(input: string, maxLength = 5000): string {
  return input.replace(CONTROL_AND_ZW, '').trim().slice(0, maxLength);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}
