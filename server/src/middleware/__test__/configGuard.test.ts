import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { configGuard } from '../configGuard.js';
import { AppError } from '../errorHandler.js';

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    ...overrides,
  } as Request;
}

function createMockRes(): Response {
  return {} as Response;
}

describe('configGuard', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    // 恢复原始 NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('GET 请求 + production → next() 被调用（不抛错）', () => {
    process.env.NODE_ENV = 'production';
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    expect(() => configGuard(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledOnce();
  });

  it('POST 请求 + production → 抛出 AppError(403, CONFIG_WRITE_DISABLED)', () => {
    process.env.NODE_ENV = 'production';
    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    let caughtErr: unknown = null;
    try {
      configGuard(req, res, next);
    } catch (e) {
      caughtErr = e;
    }

    expect(caughtErr).toBeInstanceOf(AppError);
    const appErr = caughtErr as AppError;
    expect(appErr.statusCode).toBe(403);
    expect(appErr.code).toBe('CONFIG_WRITE_DISABLED');
    expect(appErr.message).toContain('生产环境');
    expect(next).not.toHaveBeenCalled();
  });

  it('POST 请求 + development（默认）→ next() 被调用', () => {
    process.env.NODE_ENV = 'development';
    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    expect(() => configGuard(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledOnce();
  });

  it('PUT 请求 + production → next() 被调用（非 POST 方法不受限制）', () => {
    process.env.NODE_ENV = 'production';
    const req = createMockReq({ method: 'PUT' });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    expect(() => configGuard(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledOnce();
  });
});
