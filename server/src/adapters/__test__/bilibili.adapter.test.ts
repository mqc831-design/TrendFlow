import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BilibiliAdapter } from '../bilibili.adapter.js';

describe('BilibiliAdapter', () => {
  let adapter: BilibiliAdapter;

  beforeEach(() => {
    adapter = new BilibiliAdapter();
    process.env.BILIBILI_API_URL = '';
  });

  it('应该具有正确的平台属性', () => {
    expect(adapter.platform).toBe('bilibili');
    expect(adapter.platformName).toBe('B站');
    expect(adapter.sourceName).toBe('bilibili-hot');
  });

  it('fetchMock 应该返回 20 条数据', async () => {
    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(20);
  });

  it('fetchMock 返回的数据结构应该正确', async () => {
    const result = await adapter.fetchHotList();
    expect(result.platform).toBe('bilibili');
    expect(result.platformName).toBe('B站');
    expect(result.sourceName).toBe('bilibili-hot');
    expect(result.updatedAt).toBeDefined();

    const first = result.items[0];
    expect(first.rank).toBe(1);
    expect(first.title).toBeDefined();
    expect(typeof first.title).toBe('string');
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.url).toBeDefined();
    expect(first.url).toContain('bilibili');
    expect(first.url).toContain('BV');
    expect(first.createdAt).toBeDefined();
    expect(first.updatedAt).toBeDefined();
  });

  it('fetchMock 的 URL 应该包含 bvid', async () => {
    const result = await adapter.fetchHotList();
    for (const item of result.items) {
      expect(item.url).toMatch(/\/video\/BV/);
    }
  });

  it('fetchMock 的 heat 应该格式化为"X 万播放"格式', async () => {
    const result = await adapter.fetchHotList();
    const heatItems = result.items.filter((item) => item.heat !== null);
    expect(heatItems.length).toBeGreaterThan(0);
    for (const item of heatItems) {
      expect(item.heat).toMatch(/万播放$/);
    }
  });

  it('fetchMock 应该有部分条目的 heat 为 null（至少 2 条）', async () => {
    const result = await adapter.fetchHotList();
    const nullHeatItems = result.items.filter((item) => item.heat === null);
    expect(nullHeatItems.length).toBeGreaterThanOrEqual(2);
  });

  it('fetchMock 应该包含 tag 多样性', async () => {
    const result = await adapter.fetchHotList();
    const tags = result.items.map((item) => item.tag);
    const uniqueTags = new Set(tags);
    expect(uniqueTags.size).toBeGreaterThanOrEqual(2);
    expect(tags).toContain('热');
    expect(tags).toContain('荐');
    expect(tags).toContain('新');
    expect(tags).toContain(undefined);
  });

  it('fetchMock 应该包含 summary 字段', async () => {
    const result = await adapter.fetchHotList();
    const hasSummary = result.items.filter((item) => item.summary != null);
    expect(hasSummary.length).toBeGreaterThanOrEqual(5);
  });

  it('BILIBILI_API_URL 设为空字符串时应该走 Mock', async () => {
    process.env.BILIBILI_API_URL = '';
    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(20);
    expect(result.platform).toBe('bilibili');
  });

  it('fetchFromRemote 在网络错误时应抛出 UPSTREAM_ERROR', async () => {
    process.env.BILIBILI_API_URL = 'https://api.example.com/bilibili';

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to connect')));

    try {
      await adapter.fetchHotList();
      expect.unreachable('应该抛出 AppError');
    } catch (err: any) {
      expect(err.code).toBe('UPSTREAM_ERROR');
      expect(err.statusCode).toBe(502);
      expect(err.message).toContain('B站热榜获取失败');
    }
  });

  it('fetchFromRemote 在 HTTP 错误时应抛出 UPSTREAM_ERROR', async () => {
    process.env.BILIBILI_API_URL = 'https://api.example.com/bilibili';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }),
    );

    try {
      await adapter.fetchHotList();
      expect.unreachable('应该抛出 AppError');
    } catch (err: any) {
      expect(err.code).toBe('UPSTREAM_ERROR');
      expect(err.statusCode).toBe(502);
      expect(err.message).toContain('B站热榜获取失败');
    }
  });

  it('fetchFromRemote 应正确映射真实 API 字段（stat.view → heat）', async () => {
    process.env.BILIBILI_API_URL = 'https://api.example.com/bilibili';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            list: [
              {
                title: '测试视频',
                bvid: 'BV1xx411c7mA',
                stat: { view: 1234567 },
              },
              {
                title: '小播放量视频',
                bvid: 'BV1xx411c7mB',
                stat: { view: 5000 },
              },
            ],
          },
        }),
      }),
    );

    const result = await adapter.fetchHotList();
    expect(result.items[0].heat).toBe('123.5 万播放');
    expect(result.items[1].heat).toBe('0.5 万播放');
  });

  it('fetchFromRemote 在实际数据为空时应该返回空 items', async () => {
    process.env.BILIBILI_API_URL = 'https://api.example.com/bilibili';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 0, data: { list: [] } }),
      }),
    );

    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(0);
  });

  it('fetchFromRemote 应携带移动端 User-Agent 和 Referer', async () => {
    process.env.BILIBILI_API_URL = 'https://api.example.com/bilibili';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 0, data: { list: [] } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await adapter.fetchHotList();

    const callHeaders = mockFetch.mock.calls[0][1]?.headers;
    expect(callHeaders['User-Agent']).toContain('iPhone');
    expect(callHeaders['Referer']).toBe('https://m.bilibili.com/');
  });
});
