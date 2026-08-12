import type { AuthError } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { isAllowedSchoolEmail, supabase } from '@/lib/supabase';

export const VERIFICATION_CODE_LENGTH = 6;
/** Supabase rejects a resend inside its own window; keep the UI in step with it. */
export const RESEND_COOLDOWN_SECONDS = 60;

export type AuthResult = { ok: true } | { ok: false; message: string };

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeCode(code: string) {
  return code.replace(/\D/g, '').slice(0, VERIFICATION_CODE_LENGTH);
}

/**
 * Emails a one-time verification code. `shouldCreateUser` is on because the very
 * first sign-in is also the sign-up; the `handle_new_user` trigger rejects any
 * address outside the allowed domain, and we pre-check here for a better error.
 */
export async function sendVerificationCode(email: string): Promise<AuthResult> {
  const address = normalizeEmail(email);
  if (!isAllowedSchoolEmail(address)) {
    return { ok: false, message: `Use your school account ending in ${env.allowedEmailDomain}.` };
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: { shouldCreateUser: true },
  });
  return error ? { ok: false, message: describeAuthError(error) } : { ok: true };
}

export async function verifyCode(email: string, code: string): Promise<AuthResult> {
  const token = normalizeCode(code);
  if (token.length !== VERIFICATION_CODE_LENGTH) {
    return { ok: false, message: `Enter the ${VERIFICATION_CODE_LENGTH}-digit code from your email.` };
  }
  const address = normalizeEmail(email);
  // A returning student's code is a magiclink token ('email'), but the very first
  // sign-in creates the user and issues a signup token instead. Trying 'email'
  // first and falling back keeps both paths working without asking the student
  // whether they have signed in before.
  let { data, error } = await supabase.auth.verifyOtp({ email: address, token, type: 'email' });
  if (error) {
    const retry = await supabase.auth.verifyOtp({ email: address, token, type: 'signup' });
    if (!retry.error) ({ data, error } = retry);
  }
  if (error) return { ok: false, message: describeAuthError(error) };
  if (!data.session) return { ok: false, message: 'That code could not be verified. Request a new one.' };
  return { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return error ? { ok: false, message: describeAuthError(error) } : { ok: true };
}

/** Supabase surfaces these as raw Postgres/GoTrue strings; make them student-readable. */
export function describeAuthError(error: AuthError): string {
  const raw = error.message ?? '';
  if (raw.includes('Only') && raw.includes(env.allowedEmailDomain)) {
    return `Only ${env.allowedEmailDomain} school accounts can be used.`;
  }
  if (error.status === 429 || /rate limit|too many/i.test(raw)) {
    return 'Too many code requests. Wait a minute and try again.';
  }
  if (/expired|invalid/i.test(raw)) {
    return 'That code is wrong or has expired. Request a new one.';
  }
  if (/signups? (not allowed|disabled)/i.test(raw)) {
    return 'New sign-ups are disabled. Contact a school administrator.';
  }
  if (/database error/i.test(raw)) {
    return `Sign-in was rejected by the backend. Only ${env.allowedEmailDomain} accounts are allowed.`;
  }
  return raw || 'Something went wrong. Try again.';
}
