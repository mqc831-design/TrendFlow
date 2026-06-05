import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { HotList, Platform } from '@shared/types';

// ========== Mock 服务层 ==========
const mockConfigGet = vi.fn();

vi.mock('../../services/configService.js', () => ({
  configService: {
    get: () => mockConfigGet(),
  },
}));

const mockRefreshAll = vi.fn();

vi.mock('../../services/cacheService.js', () => ({
  cacheService: {
    refreshAll: (...args: any[]) => mockRefreshAll(...args),
  },
}));

// ========== 真实依赖 ==========
import { apiRouter } from '../index.js';

// ========== 辅助函数 ==========
function makeHotList(platform: Platform, overrides: Partial<HotList> = {}): HotList {
  return {
    platform,
    platformName: { weibo: '微博', zhihu: '知乎', bilibili: 'B站' }[platform],
    sourceName: 'test-source',
    updatedAt: new Date().toISOString(),
    items: Array.from({ length: 25 }, (_, i) => ({
      rank: i + 1,
      title: `${platform}热搜#${i + 1}`,
      url: `https://${platform}.com/hot/${i + 1}`,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })),
    ...overrides,
  };
}

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

/**
 * 从 apiRouter 的 stack 中找到指定 method+path 的 handler。
 * apiRouter 内部通过 .use('/hot-lists', hotRouter) 和 .use('/config', ...) 挂载了子路由。
 * 对于 GET /health 和 POST /refresh，它们直接挂在 apiRouter 上。
 */
function findHandler(method: string, path: string): Function {
  const lowerMethod = method.toLowerCase();
  const layer = (apiRouter as any).stack.find((l: any) => {
    if (!l.route || l.route.path !== path) return false;
    return l.route.stack.some((s: any) => s.method === lowerMethod);
  });
  if (!layer) throw new Error(`Route ${method} ${path} not found in apiRouter`);
  const methodLayer = layer.route.stack.find(
    (s: any) => s.method === lowerMethod,
  );
  return methodLayer.handle;
}

const defaultConfig = {
  sources: { weibo: true, zhihu: true, bilibili: true },
  topN: 20,
  cacheTTL: 300,
};

// ========== 测试用例 ==========
describe('apiRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigGet.mockReturnValue({ ...defaultConfig });
  });

  describe('GET /api/health', () => {
    it('应返回 { ok: true }', () => {
      const req = createMockReq();
      const res = createMockRes();
      const handler = findHandler('GET', '/health');

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('POST /api/refresh', () => {
    it('应返回 200 和 HotListResponse 结构，cache.hit=false', async () => {
      mockRefreshAll.mockResolvedValueOnce([
        makeHotList('weibo'),
        makeHotList('zhihu'),
        makeHotList('bilibili'),
      ]);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/refresh');

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const body = (res.json as any).mock.calls[0][0];
      expect(body.data).toHaveLength(3);
      expect(body.cache).toEqual({ hit: false, ttl: 300 });
      expect(body.updatedAt).toBeDefined();
      expect(mockRefreshAll).toHaveBeenCalledWith(['weibo', 'zhihu', 'bilibili']);
    });

    it('应按 topN=10 截断数据', async () => {
      mockConfigGet.mockReturnValue({ ...defaultConfig, topN: 10 });
      mockRefreshAll.mockResolvedValueOnce([makeHotList('weibo')]);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/refresh');

      await handler(req, res, next);

      const body = (res.json as any).mock.calls[0][0];
      expect(body.data[0].items).toHaveLength(10);
    });

    it('应只刷新启用的平台', async () => {
      mockConfigGet.mockReturnValue({
        ...defaultConfig,
        sources: { weibo: true, zhihu: false, bilibili: false },
      });
      mockRefreshAll.mockResolvedValueOnce([makeHotList('weibo')]);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/refresh');

      await handler(req, res, next);

      expect(mockRefreshAll).toHaveBeenCalledWith(['weibo']);
    });

    it('全部平台禁用时应返回空数据数组', async () => {
      mockConfigGet.mockReturnValue({
        ...defaultConfig,
        sources: { weibo: false, zhihu: false, bilibili: false },
      });
      mockRefreshAll.mockResolvedValueOnce([]);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/refresh');

      await handler(req, res, next);

      expect(mockRefreshAll).toHaveBeenCalledWith([]);
      const body = (res.json as any).mock.calls[0][0];
      expect(body.data).toEqual([]);
    });

    it('refreshAll 失败时应调用 next(err)', async () => {
      const err = new Error('完全不可用');
      mockRefreshAll.mockRejectedValueOnce(err);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('POST', '/refresh');

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
