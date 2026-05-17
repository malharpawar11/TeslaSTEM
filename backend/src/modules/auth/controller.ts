import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { badRequest, unauthorized } from '@/utils/errors';
import {
  loginWithOAuth,
  loginWithPassword,
  logout,
  logoutEverywhere,
  refreshSession,
  signupWithPassword,
  softDeleteAccount,
} from './service';

function opts(req: Request) {
  return { ip: req.ip ?? null, userAgent: req.header('user-agent') ?? null };
}

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await signupWithPassword(req.body as never, opts(req));
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginWithPassword(req.body as never, opts(req));
  res.status(200).json(result);
});

export const oauthGoogle = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken: string };
  const result = await loginWithOAuth('GOOGLE', idToken, opts(req));
  res.status(200).json(result);
});

export const oauthMicrosoft = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken: string };
  const result = await loginWithOAuth('MICROSOFT', idToken, opts(req));
  res.status(200).json(result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  if (!refreshToken) throw badRequest('Refresh token required');
  const result = await refreshSession(refreshToken, opts(req));
  res.status(200).json(result);
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken, everywhere } = (req.body ?? {}) as { refreshToken?: string; everywhere?: boolean };

  if (everywhere) {
    if (!req.auth) throw unauthorized();
    await logoutEverywhere(req.auth.id);
  } else {
    await logout(refreshToken, req.auth?.id);
  }
  res.status(204).end();
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { reason } = (req.body ?? {}) as { reason?: string };
  await softDeleteAccount(req.auth.id, reason);
  res.status(204).end();
});
