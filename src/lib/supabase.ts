import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env, isBackendConfigured } from '@/config/env';

// The client is always non-null so call sites don't each need a null check; when
// the backend is unconfigured `isBackendConfigured` is false and the app shows a
// setup screen instead of firing requests at a placeholder host.
export const supabase = createClient(
  env.supabaseUrl || 'https://unconfigured.supabase.co',
  env.supabaseAnonKey || 'unconfigured-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // React Native has no URL to parse a session out of.
      detectSessionInUrl: false,
    },
  },
);

export { isBackendConfigured };

export function isAllowedSchoolEmail(email?: string | null) {
  return !!email?.trim().toLowerCase().endsWith(env.allowedEmailDomain);
}
