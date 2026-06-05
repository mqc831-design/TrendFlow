import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchHotLists,
  fetchHotList,
  triggerRefresh,
  fetchConfig,
  updateConfig,
  ApiError,
} from '../client';
import type { HotListResponse, HotList, AppConfig } from '@shared/types';

// ---- Mock global fetch ----

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
  vi.stubEnv('VITE_API_BASE', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---- Helper ----

function mockOkResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

function mockErrorResponse(status: number, body: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

// ---- Mock data ----

const mockHotListResponse: HotListResponse = {
  updatedAt: '2026-06-04T10:00:00.000Z',
  cache: { hit: true, ttl: 300 },
  data: [
    {
      platform: 'weibo',
      platformName: '微博',
      sourceName: '微博热搜',
      updatedAt: '2026-06-04T09:55:00.000Z',
      items: [],
    },
  ],
};

const mockHotList: HotList = {
  platform: 'weibo',
  platformName: '微博',
  sourceName: '微博热搜',
  updatedAt: '2026-06-04T10:00:00.000Z',
  items: [],
};

const mockConfig: AppConfig = {
  keywords: [],
  matchMode: 'any',
  sources: { weibo: true, zhihu: true, bilibili: true },
  topN: 20,
  refreshMode: 'both',
  scheduledTime: '08:00',
  cacheTTL: 600,
};

// ================================================================

describe('fetchHotLists', () => {
  it('调用 GET /api/hot-lists 并返回 HotListResponse', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse(mockHotListResponse));

    const result = await fetchHotLists();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/hot-lists', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(mockHotListResponse);
    expect(result.cache.hit).toBe(true);
  });
});

// ================================================================

describe('fetchHotList', () => {
  it('调用 GET /api/hot-lists/:platform', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse(mockHotList));

    const result = await fetchHotList('weibo');

    expect(mockFetch).toHaveBeenCalledWith('/api/hot-lists/weibo', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(mockHotList);
  });

  it('支持 zhihu 平台参数', async () => {
    const zhihuList: HotList = { ...mockHotList, platform: 'zhihu', platformName: '知乎' };
    mockFetch.mockResolvedValueOnce(mockOkResponse(zhihuList));

    const result = await fetchHotList('zhihu');

    expect(mockFetch).toHaveBeenCalledWith('/api/hot-lists/zhihu', expect.any(Object));
    expect(result.platform).toBe('zhihu');
  });

  it('支持 bilibili 平台参数', async () => {
    const biliList: HotList = { ...mockHotList, platform: 'bilibili', platformName: 'B站' };
    mockFetch.mockResolvedValueOnce(mockOkResponse(biliList));

    const result = await fetchHotList('bilibili');

    expect(mockFetch).toHaveBeenCalledWith('/api/hot-lists/bilibili', expect.any(Object));
    expect(result.platformName).toBe('B站');
  });
});

// ================================================================

describe('triggerRefresh', () => {
  it('调用 POST /api/refresh 并返回 HotListResponse', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse(mockHotListResponse));

    const result = await triggerRefresh();

    expect(mockFetch).toHaveBeenCalledWith('/api/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(mockHotListResponse);
  });
});

// ================================================================

describe('fetchConfig', () => {
  it('调用 GET /api/config', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse(mockConfig));

    const result = await fetchConfig();

    expect(mockFetch).toHaveBeenCalledWith('/api/config', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(mockConfig);
  });
});

// ================================================================

describe('updateConfig', () => {
  it('调用 POST /api/config 并发送 JSON body', async () => {
    const partial = { topN: 30 as const, keywords: ['热点'] };
    mockFetch.mockResolvedValueOnce(mockOkResponse({ ...mockConfig, ...partial }));

    const result = await updateConfig(partial);

    expect(mockFetch).toHaveBeenCalledWith('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    expect(result.topN).toBe(30);
    expect(result.keywords).toContain('热点');
  });

  it('支持部分字段更新 AppConfigPartial', async () => {
    const partial = { cacheTTL: 1200 };
    mockFetch.mockResolvedValueOnce(mockOkResponse({ ...mockConfig, cacheTTL: 1200 }));

    const result = await updateConfig(partial);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body).toEqual({ cacheTTL: 1200 });
    expect(result.cacheTTL).toBe(1200);
  });
});

// ================================================================

describe('ApiError', () => {
  it('在非 ok 响应时抛出 ApiError，status 和 body 正确', async () => {
    const errorBody = {
      error: true as const,
      code: 'NOT_FOUND',
      message: '平台不存在',
      details: 'Platform xyz not found',
    };

    // 使用 mockResolvedValue（非 Once）因为下面会调用两次
    mockFetch.mockResolvedValue(mockErrorResponse(404, errorBody));

    // 详细验证 status/body/message/name
    try {
      await fetchHotList('xyz');
      // 不应到达这里
      expect(false).toBe(true);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      if (err instanceof ApiError) {
        expect(err.status).toBe(404);
        expect(err.body).toEqual(errorBody);
        expect(err.body.code).toBe('NOT_FOUND');
        expect(err.message).toBe('平台不存在');
        expect(err.name).toBe('ApiError');
      }
    }
  });

  it('HTTP 500 错误也抛出 ApiError', async () => {
    const errorBody = {
      error: true as const,
      code: 'INTERNAL_ERROR',
      message: '服务端内部错误',
    };

    mockFetch.mockResolvedValueOnce(mockErrorResponse(500, errorBody));

    await expect(fetchHotLists()).rejects.toBeInstanceOf(ApiError);
  });

  it('HTTP 400 错误也抛出 ApiError', async () => {
    const errorBody = {
      error: true as const,
      code: 'BAD_REQUEST',
      message: '参数错误',
    };

    mockFetch.mockResolvedValueOnce(mockErrorResponse(400, errorBody));

    await expect(updateConfig({ keywords: [] })).rejects.toBeInstanceOf(ApiError);
  });
});
