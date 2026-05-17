import { z } from 'zod';
import { PAGINATION } from '@/config/constants';

export const paginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
  cursor: z.string().min(1).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function buildCursorPage<T extends { id: string }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
  return { items, nextCursor };
}
