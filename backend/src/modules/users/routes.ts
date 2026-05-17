import { Router } from 'express';
import { requireAuth } from '@/middleware/authn';
import { validate } from '@/middleware/validate';
import { writeLimiter } from '@/middleware/rateLimit';
import { getMe, registerDevice, unregisterDevice, updateMe } from './controller';
import { deviceParamSchema, registerDeviceSchema, updateMeSchema } from './schemas';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/me', getMe);
usersRouter.patch('/me', writeLimiter, validate({ body: updateMeSchema }), updateMe);
usersRouter.post('/me/devices', writeLimiter, validate({ body: registerDeviceSchema }), registerDevice);
usersRouter.delete('/me/devices/:id', validate({ params: deviceParamSchema }), unregisterDevice);
