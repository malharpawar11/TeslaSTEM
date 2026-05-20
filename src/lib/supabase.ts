import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// A real Supabase project URL is exactly `https://<alphanum-ref>.supabase.co`.
// Placeholder strings like "your-project", "fake", or empty values must not
// create a live client — doing so opens a WebSocket to a non-existent host
// and floods the console with connection errors.
const REAL_SUPABASE_URL = /^https:\/\/[a-z0-9]{20,}\.supabase\.co$/;

export const isSupabaseConfigured =
  REAL_SUPABASE_URL.test(url) &&
  anonKey.length >= 32 &&
  anonKey !== 'your-anon-key';

/**
 * The client is `null` when unconfigured rather than a broken instance, so a
 * forgotten guard fails loudly at the call site instead of hanging on a
 * request to a placeholder URL.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      // This app uses REST + Auth only — no live subscriptions.
      // Disable the Realtime WebSocket so it never opens a socket connection.
      realtime: {
        params: { eventsPerSecond: 0 },
        // @ts-ignore — timeout: 0 prevents auto-connect on client creation
        timeout: 0,
      },
    })
  : null;
