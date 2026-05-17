import { z } from 'zod';

export const updateMeSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const registerDeviceSchema = z.object({
  expoPushToken: z
    .string()
    .min(10)
    .max(200)
    .regex(/^ExponentPushToken\[[A-Za-z0-9_-]+\]$/, 'Invalid Expo push token'),
  platform: z.enum(['IOS', 'ANDROID', 'WEB']),
  appVersion: z.string().max(40).optional(),
});

export const deviceParamSchema = z.object({
  id: z.string().min(1).max(64),
});
