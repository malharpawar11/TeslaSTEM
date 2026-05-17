import { z } from 'zod';
import { paginationQuerySchema } from '@/utils/pagination';

const trimmedString = (max: number) => z.string().trim().max(max);

export const createClubSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(4000),
  meetingDay: trimmedString(40).optional(),
  meetingTime: trimmedString(40).optional(),
  location: trimmedString(120).optional(),
  advisor: trimmedString(120).optional(),
  contactEmail: z.string().trim().toLowerCase().email().max(254).optional(),
  imageUrl: z.string().trim().url().max(2048).optional(),
});

export const updateClubSchema = createClubSchema.partial();

export const listClubsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  // Only super admins may pass approved=false; controller enforces.
  approved: z.coerce.boolean().optional(),
});

export const clubIdParamSchema = z.object({ clubId: z.string().min(1).max(64) });

export const assignAdminSchema = z.object({
  userId: z.string().min(1).max(64),
});

export const removeAdminParamSchema = clubIdParamSchema.extend({
  userId: z.string().min(1).max(64),
});

export const approveClubSchema = z.object({
  approved: z.boolean(),
});
