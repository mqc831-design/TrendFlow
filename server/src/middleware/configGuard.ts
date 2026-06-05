import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

function configGuard(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === 'POST' && process.env.NODE_ENV === 'production') {
    throw new AppError(
      403,
      'CONFIG_WRITE_DISABLED',
      '生产环境禁止通过 API 修改配置，请通过环境变量或配置文件管理',
    );
  }
  next();
}

export { configGuard };
