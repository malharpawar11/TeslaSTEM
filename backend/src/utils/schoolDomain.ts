import { env } from '@/config/env';
import { normalizeEmail } from '@/utils/sanitize';

// Source of truth for school-email policy. Used by signup, OAuth callbacks, and
// invitation flows. Never trust client to verify domain membership.
export function isSchoolEmail(email: string): boolean {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf('@');
  if (at <= 0 || at === e.length - 1) return false;
  const domain = e.slice(at + 1);
  return env.SCHOOL_EMAIL_DOMAINS.includes(domain);
}
