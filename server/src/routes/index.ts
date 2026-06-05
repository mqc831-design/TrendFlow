import { Router, Request, Response, NextFunction } from 'express';
import { hotRouter } from './hot.js';
import { configRouter } from './config.js';
import { configGuard } from '../middleware/configGuard.js';
import { cacheService } from '../services/cacheService.js';
import { configService } from '../services/configService.js';
import { AppError } from '../middleware/errorHandler.js';
import { Platform } from '@shared/types';

const apiRouter = Router();

apiRouter.use('/hot-lists', hotRouter);
apiRouter.use('/config', configGuard, configRouter);

apiRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = configService.get();
    const enabledPlatforms = (Object.keys(config.sources) as Platform[])
      .filter((k) => config.sources[k]);
    const results = await cacheService.refreshAll(enabledPlatforms);
    const data = results.map((list) => ({
      ...list,
      items: list.items.slice(0, config.topN),
    }));
    res.json({
      updatedAt: new Date().toISOString(),
      cache: { hit: false, ttl: config.cacheTTL },
      data,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/refresh/:platform', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = req.params;
    const validPlatforms: Platform[] = ['weibo', 'zhihu', 'bilibili'];
    if (!validPlatforms.includes(platform as Platform)) {
      throw new AppError(404, 'PLATFORM_NOT_FOUND', `平台 "${platform}" 不存在`);
    }
    const config = configService.get();
    const result = await cacheService.getOrFetch(platform as Platform, true);
    res.json({
      ...result,
      items: result.items.slice(0, config.topN),
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export { apiRouter };
