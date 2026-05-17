import { z } from 'zod';
import { SECURITY } from '@/config/constants';

const password = z
  .string()
  .min(SECURITY.passwordMinLength)
  .max(SECURITY.passwordMaxLength);

const email = z.string().trim().toLowerCase().email().max(254);

export const signupSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(1).max(80),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(SECURITY.passwordMaxLength),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(4096),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(20).max(4096).optional(),
  everywhere: z.boolean().optional(),
});

export const oauthSchema = z.object({
  idToken: z.string().min(20).max(8192),
});

export const requestPasswordResetSchema = z.object({ email });
export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(512),
  newPassword: password,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20).max(512),
});

export const deleteAccountSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type SignupBody = z.infer<typeof signupSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
