import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;

function read(key: string, fallback?: string) {
  return String(extra[key] ?? fallback ?? '').trim();
}

export const env = {
  supabaseUrl: read('supabaseUrl', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: read('supabaseAnonKey', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  // Every account — and every row in the backend — is gated on this suffix.
  allowedEmailDomain: read('allowedEmailDomain', process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN) || '@lwsd.org',
  easProjectId: String(extra.eas?.projectId ?? '').trim(),
};

export const isBackendConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

// The placeholder ships in app.json until `eas init` runs; push tokens cannot be
// minted before then, so callers skip token registration instead of crashing.
export const isEasProjectLinked =
  Boolean(env.easProjectId) && env.easProjectId !== 'replace-with-eas-project-id';
