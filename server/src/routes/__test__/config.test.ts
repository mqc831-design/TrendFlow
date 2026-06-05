import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AppConfig } from '@shared/types';

// ========== Mock 服务层 ==========
const mockConfigGet = vi.fn();
const mockConfigUpdate = vi.fn();

vi.mock('../../services/configService.js', () => ({
  configService: {
    get: () => mockConfigGet(),
    update: (partial: any) => mockConfigUpdate(partial),
  },
}));

// ========== 真实依赖 ==========
import { configRouter } from '../config.js';

// ========== 辅助函数 ==========
const DEFAULT_CONFIG: AppConfig = {
  keywords: [],
  matchMode: 'any',
  sources: { weibo: true, zhihu: true, bilibili: true },
  topN: 20,
  refreshMode: 'both',
  scheduledTime: '08:00',
  cacheTTL: 600,
};

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as Request;
}

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function findHandler(method: string, path: string): Function {
  // 同一路径可能有多层（GET 和 POST 各自独立），按 path+method 精确匹配
  const lowerMethod = method.toLowerCase();
  const layer = (configRouter as any).stack.find((l: any) => {
    if (!l.route || l.route.path !== path) return false;
    return l.route.stack.some((s: any) => s.method === lowerMethod);
  });
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  const methodLayer = layer.route.stack.find(
    (s: any) => s.method === lowerMethod,
  );
  return methodLayer.handle;
}

// ========== 测试用例 ==========
describe('configRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigGet.mockReturnValue({ ...DEFAULT_CONFIG });
    mockConfigUpdate.mockImplementation((partial: any) => ({
      ...DEFAULT_CONFIG,
      ...partial,
    }));
  });

  // ===== GET / =====
  describe('GET /api/config', () => {
    it('应返回 200 和完整的 AppConfig 结构', () => {
      const req = createMockReq();
      const res = createMockRes();
      const handler = findHandler('GET', '/');

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith(DEFAULT_CONFIG);
      expect(mockConfigGet).toHaveBeenCalled();
    });

    it('应返回包含所有必需字段的配置', () => {
      const req = createMockReq();
      const res = createMockRes();
      const handler = findHandler('GET', '/');

      handler(req, res);

      const body = (res.json as any).mock.calls[0][0];
      expect(body).toHaveProperty('keywords');
      expect(body).toHaveProperty('matchMode');
      expect(body).toHaveProperty('sources');
      expect(body).toHaveProperty('topN');
      expect(body).toHaveProperty('refreshMode');
      expect(body).toHaveProperty('scheduledTime');
      expect(body).toHaveProperty('cacheTTL');
    });
  });

  // ===== POST / =====
  describe('POST /api/config', () => {
    it('合法数据 topN=10 应更新并返回新配置', async () => {
      mockConfigUpdate.mockReturnValueOnce({ ...DEFAULT_CONFIG, topN: 10 });

      const req = createMockReq({ body: { topN: 10 } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/');

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const body = (res.json as any).mock.calls[0][0];
      expect(body.topN).toBe(10);
      expect(mockConfigUpdate).toHaveBeenCalledWith({ topN: 10 });
    });

    it('合法数据 matchMode=exclude 应成功', async () => {
      mockConfigUpdate.mockReturnValueOnce({ ...DEFAULT_CONFIG, matchMode: 'exclude' });

      const req = createMockReq({ body: { matchMode: 'exclude' } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/');

      await handler(req, res, next);

      const body = (res.json as any).mock.calls[0][0];
      expect(body.matchMode).toBe('exclude');
    });

    it('合法数据 cacheTTL 边界值 60 应成功', async () => {
      mockConfigUpdate.mockReturnValueOnce({ ...DEFAULT_CONFIG, cacheTTL: 60 });

      const req = createMockReq({ body: { cacheTTL: 60 } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/');

      await handler(req, res, next);

      const body = (res.json as any).mock.calls[0][0];
      expect(body.cacheTTL).toBe(60);
    });

    it('合法数据多字段同时更新应成功', async () => {
      const update = { keywords: ['热搜'], topN: 30, cacheTTL: 600 };
      mockConfigUpdate.mockReturnValueOnce({ ...DEFAULT_CONFIG, ...update });

      const req = createMockReq({ body: update });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/');

      await handler(req, res, next);

      const body = (res.json as any).mock.calls[0][0];
      expect(body.keywords).toEqual(['热搜']);
      expect(body.topN).toBe(30);
      expect(body.cacheTTL).toBe(600);
    });

    it('topN=50 应返回 CONFIG_INVALID', async () => {
      const req = createMockReq({ body: { topN: 50 } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/');

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'CONFIG_INVALID',
        }),
      );
      expect(mockConfigUpdate).not.toHaveBeenCalled();
    });

    it('matchMode=invalid 应返回 CONFIG_INVALID', async () => {
      const req = createMockReq({ body: { matchMode: 'invalid' } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/');

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'CONFIG_INVALID',
        }),
      );
      expect(mockConfigUpdate).not.toHaveBeenCalled();
    });

    it('cacheTTL=10 应返回 CONFIG_INVALID（小于60）', async () => {
      const req = createMockReq({ body: { cacheTTL: 10 } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/');

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'CONFIG_INVALID',
        }),
      );
      expect(mockConfigUpdate).not.toHaveBeenCalled();
    });

    it('空 body 应正常调用 update 并返回配置', async () => {
      mockConfigUpdate.mockReturnValueOnce({ ...DEFAULT_CONFIG });

      const req = createMockReq({ body: {} });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/');

      await handler(req, res, next);

      expect(mockConfigUpdate).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(DEFAULT_CONFIG);
    });
  });
});
