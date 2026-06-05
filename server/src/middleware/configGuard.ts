import { Request, Response, NextFunction } from 'express';

function configGuard(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

export { configGuard };
