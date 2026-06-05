import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '@shared/types';

class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: true,
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  console.error('[ErrorHandler] 未预期错误:', err);
  res.status(500).json({
    error: true,
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误，请稍后重试',
  });
}

export { AppError, errorHandler };
