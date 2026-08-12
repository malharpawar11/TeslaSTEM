import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { env, isEasProjectLinked } from '@/config/env';

export async function requestClubNotificationPermission() {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/**
 * Returns null instead of throwing whenever a token cannot be minted — no
 * permission, web, a simulator, or an unlinked EAS project. Following a club
 * still works without a token; only push delivery is skipped.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!(await requestClubNotificationPermission())) return null;
  if (!isEasProjectLinked) return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId });
    return token.data;
  } catch {
    return null;
  }
}
