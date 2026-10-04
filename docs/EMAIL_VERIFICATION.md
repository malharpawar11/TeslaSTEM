# Email verification

The production InsForge backend requires email verification and uses `code`, not `link`. Signup and resend use the SDK's real auth endpoints; verification calls `verifyEmail` with the six-digit OTP. Mail uses the configured club Gmail SMTP sender. Credentials remain in backend secrets, never client code.

On October 4, 2026, a live resend to the owner's supplied, registered, unverified school address returned HTTP 202. Backend logs confirmed a numeric `VERIFY_EMAIL` token and `Email sent via SMTP` using the `email-verification-code` template. The code expires after 15 minutes. SMTP acceptance does not by itself prove inbox delivery; the recipient must confirm receipt. No code was read from the database and no verification requirement was bypassed.

Unverified sign-in previously ignored resend errors and always displayed “We sent a 6-digit code.” It now propagates the error while keeping the code input and resend available, so an existing valid code can still be entered without a false delivery claim.

Validation: TypeScript checking, existing discovery regression tests, and web export. Live auth configuration was inspected; no backend configuration change was necessary.
