import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPushToken } from '@/data/notificationsRepo';
import type { ClubEvent } from '@/types/domain';

/**
 * Device notifications.
 *
 * Two separate mechanisms, deliberately:
 *
 *  - The Expo push token is stored server-side (`push_tokens`) so a trusted
 *    backend job can fan real pushes out. The app never holds push credentials
 *    itself; sending from the client would mean shipping a secret.
 *  - Meeting reminders are scheduled locally on the device, so an upcoming
 *    meeting still buzzes even with no server involved. They respect the same
 *    "reminders" preference the server-side fan-out uses.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

const REMINDER_LEAD_MINUTES = 60;

/** Web has no Expo push token, and the simulator has no device token either. */
export async function registerForPush(): Promise<{ ok: boolean; error?: string }> {
  if (Platform.OS === 'web') return { ok: false, error: 'Push is only available in the app.' };
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted) {
      const request = await Notifications.requestPermissionsAsync();
      granted = request.granted;
    }
    if (!granted) return { ok: false, error: 'Notifications are turned off in system settings.' };

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Club updates',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const res = await registerPushToken(token.data, Platform.OS);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not enable push.' };
  }
}

/**
 * Schedules a local reminder an hour before an event. Returns the scheduled
 * id so the caller can cancel it if the event moves or is cancelled.
 */
export async function scheduleEventReminder(event: ClubEvent): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const fireAt = new Date(new Date(event.startsAt).getTime() - REMINDER_LEAD_MINUTES * 60 * 1000);
  if (isNaN(fireAt.getTime()) || fireAt.getTime() <= Date.now()) return null;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: event.clubName ? `${event.clubName}: ${event.title}` : event.title,
        body: `Starts in ${REMINDER_LEAD_MINUTES} minutes${event.location ? ` · ${event.location}` : ''}`,
        data: { clubId: event.clubId, eventId: event.id },
      },
      trigger: { date: fireAt },
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or cancelled; nothing to do.
  }
}

/** Keeps the app icon badge in step with the unread count. */
export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Badges are unavailable on some Android launchers; not worth surfacing.
  }
}
