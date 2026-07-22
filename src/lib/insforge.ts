import 'react-native-url-polyfill/auto';
import { createClient, type InsForgeClient } from '@insforge/sdk';

const baseUrl = process.env.EXPO_PUBLIC_INSFORGE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY ?? '';

// A real InsForge project URL looks like https://<appkey>.<region>.insforge.app.
// Placeholder strings must not create a live client — doing so would send
// requests to a non-existent host and flood the console with errors.
const REAL_INSFORGE_URL = /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.insforge\.app$/;

export const isInsforgeConfigured = REAL_INSFORGE_URL.test(baseUrl) && anonKey.length > 10;

/**
 * `isServerMode: true` puts the SDK in its mobile/desktop auth flow — the
 * refresh token comes back in the response body instead of an httpOnly
 * cookie (there's no cookie jar in React Native), so AuthContext persists it
 * to AsyncStorage itself.
 */
export const insforge: InsForgeClient | null = isInsforgeConfigured
  ? createClient({ baseUrl, anonKey, isServerMode: true })
  : null;
