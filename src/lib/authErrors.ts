/** Identify verification failures without treating every forbidden request as one. */
export function requiresEmailVerification(error: {
  error?: string;
  statusCode?: number;
  message?: string;
}): boolean {
  return (
    error.error === "AUTH_NEED_VERIFICATION" ||
    (error.statusCode === 403 &&
      error.message?.trim().toLowerCase() === "email verification required")
  );
}
