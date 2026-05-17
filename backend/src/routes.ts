import { Router } from 'express';
import { authRouter } from '@/modules/auth/routes';
import { usersRouter } from '@/modules/users/routes';
import { clubsRouter } from '@/modules/clubs/routes';
import { clubAnnouncementsRouter, announcementsRouter } from '@/modules/announcements/routes';
import { reportsRouter } from '@/modules/moderation/routes';
import { adminRouter } from '@/modules/admin/routes';
import { healthRouter } from '@/modules/health/routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/clubs', clubsRouter);

// Nested announcements under clubs/:clubId/announcements
apiRouter.use('/clubs/:clubId/announcements', clubAnnouncementsRouter);

// Standalone announcement endpoints (/me/feed, /announcements/:id/read, etc.)
apiRouter.use('/', announcementsRouter);

apiRouter.use('/', reportsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/', healthRouter);
