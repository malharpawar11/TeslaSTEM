import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const expo = new Expo();

interface PushPayload {
  to: string[];           // Expo push tokens
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Dispatch in chunks (Expo limits ~100 per request). We swallow individual
// errors so a bad token does not nuke the whole broadcast.
export async function sendExpoPush(payload: PushPayload): Promise<ExpoPushTicket[]> {
  const valid = payload.to.filter((t) => Expo.isExpoPushToken(t));
  if (valid.length === 0) return [];

  const messages: ExpoPushMessage[] = valid.map((to) => ({
    to,
    sound: 'default',
    title: payload.title.slice(0, 100),
    body: payload.body.slice(0, 240),
    data: payload.data ?? {},
    // priority + channelId are honoured by the Expo client on Android
    priority: 'default',
    channelId: 'announcements',
  }));

  const tickets: ExpoPushTicket[] = [];
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const result = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...result);
    } catch (err) {
      logger.error({ err, count: chunk.length }, 'expo push chunk failed');
    }
  }

  // Best-effort cleanup of tokens the platform rejected as no-longer-registered.
  const invalid: string[] = [];
  tickets.forEach((t, i) => {
    if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') {
      const tok = chunks.flat()[i]?.to;
      if (typeof tok === 'string') invalid.push(tok);
    }
  });
  if (invalid.length) {
    await prisma.deviceToken
      .deleteMany({ where: { expoPushToken: { in: invalid } } })
      .catch((err) => logger.error({ err }, 'failed to clean unregistered tokens'));
  }

  return tickets;
}
