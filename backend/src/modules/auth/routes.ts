import { Router } from 'express';
import { validate } from '@/middleware/validate';
import { authLimiter } from '@/middleware/rateLimit';
import { requireAuth } from '@/middleware/authn';
import {
  deleteAccount,
  login,
  logoutHandler,
  oauthGoogle,
  oauthMicrosoft,
  refresh,
  signup,
} from './controller';
import {
  deleteAccountSchema,
  loginSchema,
  logoutSchema,
  oauthSchema,
  refreshSchema,
  signupSchema,
} from './schemas';

export const authRouter = Router();

authRouter.post('/signup', authLimiter, validate({ body: signupSchema }), signup);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), login);
authRouter.post('/oauth/google', authLimiter, validate({ body: oauthSchema }), oauthGoogle);
authRouter.post('/oauth/microsoft', authLimiter, validate({ body: oauthSchema }), oauthMicrosoft);
authRouter.post('/refresh', authLimiter, validate({ body: refreshSchema }), refresh);
authRouter.post('/logout', validate({ body: logoutSchema }), logoutHandler);
authRouter.delete(
  '/account',
  requireAuth,
  validate({ body: deleteAccountSchema }),
  deleteAccount,
);
