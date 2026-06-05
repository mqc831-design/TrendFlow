import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeiboAdapter } from '../weibo.adapter.js';

describe('WeiboAdapter', () => {
  let adapter: WeiboAdapter;

  beforeEach(() => {
    adapter = new WeiboAdapter();
    process.env.WEIBO_API_URL = '';
  });

  it('应该具有正确的平台属性', () => {
    expect(adapter.platform).toBe('weibo');
    expect(adapter.platformName).toBe('微博');
    expect(adapter.sourceName).toBe('weibo-hot-search');
  });

  it('fetchMock 应该返回 20 条数据', async () => {
    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(20);
  });

  it('fetchMock 返回的数据结构应该正确', async () => {
    const result = await adapter.fetchHotList();
    expect(result.platform).toBe('weibo');
    expect(result.platformName).toBe('微博');
    expect(result.sourceName).toBe('weibo-hot-search');
    expect(result.updatedAt).toBeDefined();

    const first = result.items[0];
    expect(first.rank).toBe(1);
    expect(first.title).toBeDefined();
    expect(first.url).toBeDefined();
    expect(first.url).toContain('weibo');
    expect(first.createdAt).toBeDefined();
    expect(first.updatedAt).toBeDefined();
  });

  it('fetchMock 应该有部分条目的 heat 为 null（至少 2 条）', async () => {
    const result = await adapter.fetchHotList();
    const nullHeatItems = result.items.filter((item) => item.heat === null);
    expect(nullHeatItems.length).toBeGreaterThanOrEqual(2);
  });

  it('fetchMock 应该包含多种 tag 类型的多样性', async () => {
    const result = await adapter.fetchHotList();
    const tags = result.items.map((item) => item.tag);
    const uniqueTags = new Set(tags);
    // 应该有 null、热、爆、新、荐 等多样性
    expect(uniqueTags.size).toBeGreaterThanOrEqual(3);
    expect(tags).toContain('热');
    expect(tags).toContain(undefined);
  });

  it('WEIBO_API_URL 设为空字符串时应该走 Mock', async () => {
    process.env.WEIBO_API_URL = '';
    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(20);
    expect(result.platform).toBe('weibo');
  });

  it('有 WEIBO_API_URL 时应该尝试远程请求并使用真实字段映射', async () => {
    process.env.WEIBO_API_URL = 'https://api.example.com/weibo';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: 1,
          data: {
            realtime: [
              { word: '测试热词', num: 99999, realpos: 1, label_name: '热' },
              { word: '普通话题', num: 50000, realpos: 2, label_name: '' },
            ],
          },
        }),
      }),
    );

    const result = await adapter.fetchHotList();
    expect(result.items).toBeDefined();
    expect(result.items.length).toBe(2);
    expect(result.items[0].title).toBe('测试热词');
    expect(result.items[0].heat).toBe('99999');
    expect(result.items[0].rank).toBe(1);
    expect(result.items[0].tag).toBe('热');
    expect(result.items[1].tag).toBeUndefined();
  });

  it('fetchFromRemote 在网络错误时应抛出 UPSTREAM_ERROR', async () => {
    process.env.WEIBO_API_URL = 'https://api.example.com/weibo';

    // Mock global fetch to reject
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    try {
      await adapter.fetchHotList();
      // 不应该走到这里
      expect.unreachable('应该抛出 AppError');
    } catch (err: any) {
      expect(err.code).toBe('UPSTREAM_ERROR');
      expect(err.statusCode).toBe(502);
      expect(err.message).toContain('微博热榜获取失败');
    }
  });

  it('fetchFromRemote 应将 AbortError 包装为 UPSTREAM_TIMEOUT', async () => {
    process.env.WEIBO_API_URL = 'https://api.example.com/weibo';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError')),
    );

    try {
      await adapter.fetchHotList();
      expect.unreachable('应该抛出 AppError');
    } catch (err: any) {
      expect(err.code).toBe('UPSTREAM_TIMEOUT');
      expect(err.statusCode).toBe(502);
      expect(err.message).toContain('超时');
    }
  });

  it('fetchFromRemote 在 HTTP 错误时应抛出 UPSTREAM_ERROR', async () => {
    process.env.WEIBO_API_URL = 'https://api.example.com/weibo';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    try {
      await adapter.fetchHotList();
      expect.unreachable('应该抛出 AppError');
    } catch (err: any) {
      expect(err.code).toBe('UPSTREAM_ERROR');
      expect(err.statusCode).toBe(502);
      expect(err.message).toContain('微博热榜获取失败');
    }
  });

  it('fetchFromRemote 应携带移动端 User-Agent 和 Referer', async () => {
    process.env.WEIBO_API_URL = 'https://api.example.com/weibo';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: 1, data: { realtime: [] } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await adapter.fetchHotList();

    const callHeaders = mockFetch.mock.calls[0][1]?.headers;
    expect(callHeaders['User-Agent']).toContain('iPhone');
    expect(callHeaders['Referer']).toBe('https://weibo.com/');
  });

  it('fetchFromRemote 应过滤 is_ad 广告条目', async () => {
    process.env.WEIBO_API_URL = 'https://api.example.com/weibo';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: 1,
          data: {
            realtime: [
              { word: '正常热搜', num: 1000, realpos: 1 },
              { word: '广告条目', num: 500, realpos: 2, is_ad: 1 },
              { word: '另一个正常', num: 800, realpos: 3 },
            ],
          },
        }),
      }),
    );

    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe('正常热搜');
    expect(result.items[1].title).toBe('另一个正常');
    expect(result.items.every((item) => item.title !== '广告条目')).toBe(true);
  });
});
