import { Router, Request, Response, NextFunction } from 'express';
import { configService } from '../services/configService.js';
import { AppError } from '../middleware/errorHandler.js';
import { AppConfigPartial } from '@shared/types';

const configRouter = Router();

configRouter.get('/', (_req: Request, res: Response) => {
  const config = configService.get();
  res.json(config);
});

configRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body: AppConfigPartial = req.body;

    if (body.topN !== undefined && ![10, 20, 30].includes(body.topN)) {
      throw new AppError(400, 'CONFIG_INVALID', 'topN 必须为 10、20 或 30');
    }
    if (body.matchMode && !['any', 'all', 'exclude'].includes(body.matchMode)) {
      throw new AppError(400, 'CONFIG_INVALID', 'matchMode 必须为 any、all 或 exclude');
    }
    if (body.cacheTTL !== undefined && (body.cacheTTL < 60 || body.cacheTTL > 3600)) {
      throw new AppError(400, 'CONFIG_INVALID', 'cacheTTL 必须在 60～3600 秒之间');
    }

    const updated = configService.update(body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export { configRouter };
