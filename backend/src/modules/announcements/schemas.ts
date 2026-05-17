import { z } from 'zod';
import { paginationQuerySchema } from '@/utils/pagination';

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(1).max(4000),
  schoolWide: z.boolean().optional().default(false),
});

export const clubIdParam = z.object({ clubId: z.string().min(1).max(64) });
export const announcementIdParam = z.object({ id: z.string().min(1).max(64) });

export const listClubAnnouncementsQuery = paginationQuerySchema;
export const myFeedQuery = paginationQuerySchema;
