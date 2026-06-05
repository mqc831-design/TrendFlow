import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService.js';
import { configService } from '../services/configService.js';
import { AppError } from '../middleware/errorHandler.js';
import { Platform } from '@shared/types';

const hotRouter = Router();

hotRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = configService.get();
    const enabledPlatforms = (Object.keys(config.sources) as Platform[])
      .filter((k) => config.sources[k]);

    const forceRefresh = req.query.refresh === '1';

    const results = await cacheService.getOrFetchAll(enabledPlatforms, forceRefresh);

    const data = results.map((list) => ({
      ...list,
      items: list.items.slice(0, config.topN),
    }));

    res.json({
      updatedAt: new Date().toISOString(),
      cache: { hit: !forceRefresh, ttl: config.cacheTTL },
      data,
    });
  } catch (err) {
    next(err);
  }
});

hotRouter.get('/:platform', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = req.params;
    const validPlatforms: Platform[] = ['weibo', 'zhihu', 'bilibili'];

    if (!validPlatforms.includes(platform as Platform)) {
      throw new AppError(404, 'PLATFORM_NOT_FOUND', `平台 "${platform}" 不存在`);
    }

    const config = configService.get();
    const forceRefresh = req.query.refresh === '1';

    const result = await cacheService.getOrFetch(platform as Platform, forceRefresh);

    res.json({
      ...result,
      items: result.items.slice(0, config.topN),
    });
  } catch (err) {
    next(err);
  }
});

export { hotRouter };
