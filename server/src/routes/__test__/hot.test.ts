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

const mockGetOrFetchAll = vi.fn();
const mockGetOrFetch = vi.fn();

vi.mock('../../services/cacheService.js', () => ({
  cacheService: {
    getOrFetchAll: (...args: any[]) => mockGetOrFetchAll(...args),
    getOrFetch: (...args: any[]) => mockGetOrFetch(...args),
  },
}));

// ========== 真实依赖 ==========
import { hotRouter } from '../hot.js';
import { errorHandler } from '../../middleware/errorHandler.js';

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
  const lowerMethod = method.toLowerCase();
  const layer = (hotRouter as any).stack.find((l: any) => {
    if (!l.route || l.route.path !== path) return false;
    return l.route.stack.some((s: any) => s.method === lowerMethod);
  });
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
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
describe('hotRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigGet.mockReturnValue({ ...defaultConfig });
  });

  // ===== GET / (聚合) =====
  describe('GET /api/hot-lists（聚合热榜）', () => {
    it('应返回所有启用平台的数据，并按 topN 截断', async () => {
      mockGetOrFetchAll.mockResolvedValueOnce([
        makeHotList('weibo'),
        makeHotList('zhihu'),
        makeHotList('bilibili'),
      ]);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/');

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const responseBody = (res.json as any).mock.calls[0][0];
      expect(responseBody.data).toHaveLength(3);
      expect(responseBody.data[0].items).toHaveLength(20); // topN=20
      expect(responseBody.cache).toEqual({ hit: true, ttl: 300 });
    });

    it('refresh=1 时 should 传递给 getOrFetchAll', async () => {
      mockGetOrFetchAll.mockResolvedValueOnce([makeHotList('weibo')]);

      const req = createMockReq({ query: { refresh: '1' } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/');

      await handler(req, res, next);

      expect(mockGetOrFetchAll).toHaveBeenCalledWith(['weibo', 'zhihu', 'bilibili'], true);
    });

    it('应只返回启用的平台', async () => {
      mockConfigGet.mockReturnValue({
        ...defaultConfig,
        sources: { weibo: true, zhihu: false, bilibili: false },
      });
      mockGetOrFetchAll.mockResolvedValueOnce([makeHotList('weibo')]);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/');

      await handler(req, res, next);

      expect(mockGetOrFetchAll).toHaveBeenCalledWith(['weibo'], false);
    });

    it('全部平台禁用时返回空数组', async () => {
      mockConfigGet.mockReturnValue({
        ...defaultConfig,
        sources: { weibo: false, zhihu: false, bilibili: false },
      });
      mockGetOrFetchAll.mockResolvedValueOnce([]);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/');

      await handler(req, res, next);

      const responseBody = (res.json as any).mock.calls[0][0];
      expect(responseBody.data).toEqual([]);
    });

    it('cacheService 抛出异常时应调用 next(err)', async () => {
      const err = new Error('服务不可用');
      mockGetOrFetchAll.mockRejectedValueOnce(err);

      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/');

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ===== GET /:platform (单平台) =====
  describe('GET /api/hot-lists/:platform（单平台热榜）', () => {
    it('有效平台应返回单平台数据', async () => {
      mockGetOrFetch.mockResolvedValueOnce(makeHotList('weibo'));

      const req = createMockReq({ params: { platform: 'weibo' } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/:platform');

      await handler(req, res, next);

      const responseBody = (res.json as any).mock.calls[0][0];
      expect(responseBody.platform).toBe('weibo');
      expect(responseBody.platformName).toBe('微博');
      expect(responseBody.items).toHaveLength(20);
    });

    it('不支持的平台应抛出 PLATFORM_NOT_FOUND', async () => {
      const req = createMockReq({ params: { platform: 'unknown' } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/:platform');

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          code: 'PLATFORM_NOT_FOUND',
        }),
      );
    });

    it('有效平台 + refresh=1 应传递 forceRefresh', async () => {
      mockGetOrFetch.mockResolvedValueOnce(makeHotList('zhihu'));

      const req = createMockReq({
        params: { platform: 'zhihu' },
        query: { refresh: '1' },
      });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/:platform');

      await handler(req, res, next);

      expect(mockGetOrFetch).toHaveBeenCalledWith('zhihu', true);
    });

    it('bilibili 单平台请求正常返回', async () => {
      mockGetOrFetch.mockResolvedValueOnce(makeHotList('bilibili'));

      const req = createMockReq({ params: { platform: 'bilibili' } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/:platform');

      await handler(req, res, next);

      const responseBody = (res.json as any).mock.calls[0][0];
      expect(responseBody.platform).toBe('bilibili');
      expect(responseBody.platformName).toBe('B站');
    });

    it('单平台请求失败时应调用 next(err)', async () => {
      const err = new Error('网络错误');
      mockGetOrFetch.mockRejectedValueOnce(err);

      const req = createMockReq({ params: { platform: 'weibo' } });
      const res = createMockRes();
      const next = vi.fn() as NextFunction;
      const handler = findHandler('GET', '/:platform');

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
