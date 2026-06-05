import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { configGuard } from '../configGuard.js';

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    ...overrides,
  } as Request;
}

function createMockRes(): Response {
  return {} as Response;
}

describe('configGuard', () => {
  it('GET 请求 → next() 被调用', () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    configGuard(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('POST 请求 → next() 被调用', () => {
    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    configGuard(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
