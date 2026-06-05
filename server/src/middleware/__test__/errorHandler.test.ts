import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from '../errorHandler.js';

/** 构建 mock Response 对象，捕获 status 和 json 调用 */
function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    ...overrides,
  } as Request;
}

describe('AppError', () => {
  it('应该正确设置 statusCode、code、message 和 details', () => {
    const err = new AppError(404, 'NOT_FOUND', '资源未找到', 'ID=123');

    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('资源未找到');
    expect(err.details).toBe('ID=123');
  });

  it('details 应该允许为 undefined', () => {
    const err = new AppError(400, 'BAD_REQUEST', '请求参数错误');

    expect(err.details).toBeUndefined();
  });
});

describe('errorHandler', () => {
  it('AppError 实例 → 返回对应的 statusCode 和标准 JSON body', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn() as NextFunction;
    const appErr = new AppError(422, 'VALIDATION_ERROR', '字段校验失败', 'email 格式不正确');

    errorHandler(appErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      code: 'VALIDATION_ERROR',
      message: '字段校验失败',
      details: 'email 格式不正确',
    });
  });

  it('AppError 不带 details → 响应中不包含 details 字段', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn() as NextFunction;
    const appErr = new AppError(401, 'UNAUTHORIZED', '未授权访问');

    errorHandler(appErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonArg.error).toBe(true);
    expect(jsonArg.code).toBe('UNAUTHORIZED');
    expect(jsonArg.message).toBe('未授权访问');
    // details 未设置时应为 undefined（不包含在 JSON 响应中）
    expect(jsonArg.details).toBeUndefined();
  });

  it('普通 Error 实例 → 返回 500 + INTERNAL_ERROR', () => {
    // 抑制 console.error 输出
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn() as NextFunction;
    const plainErr = new Error('某个未知错误');

    errorHandler(plainErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误，请稍后重试',
    });

    // 应该打印了 console.error
    expect(consoleSpy).toHaveBeenCalledWith('[ErrorHandler] 未预期错误:', plainErr);

    consoleSpy.mockRestore();
  });
});
