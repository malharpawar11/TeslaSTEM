import Constants from 'expo-constants';
const extra = Constants.expoConfig?.extra ?? {};
export const env = { supabaseUrl: String(extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || ''), supabaseAnonKey: String(extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '') };
