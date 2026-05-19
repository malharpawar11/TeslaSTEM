import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True only when real credentials are present. The shipped `.env` holds
 * placeholders (`https://your-project.supabase.co` / `your-anon-key`); when
 * unconfigured the app must keep working on mock data, so every backend call
 * site checks this flag and falls back gracefully.
 */
export const isSupabaseConfigured =
  url.startsWith('https://') &&
  !url.includes('your-project') &&
  anonKey.length > 0 &&
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
    })
  : null;
