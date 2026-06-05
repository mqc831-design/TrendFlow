import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZhihuAdapter } from '../zhihu.adapter.js';

describe('ZhihuAdapter', () => {
  let adapter: ZhihuAdapter;

  beforeEach(() => {
    adapter = new ZhihuAdapter();
    process.env.ZHIHU_API_URL = '';
  });

  it('应该具有正确的平台属性', () => {
    expect(adapter.platform).toBe('zhihu');
    expect(adapter.platformName).toBe('知乎');
    expect(adapter.sourceName).toBe('zhihu-hot');
  });

  it('fetchMock 应该返回 20 条数据', async () => {
    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(20);
  });

  it('fetchMock 返回的数据结构应该正确', async () => {
    const result = await adapter.fetchHotList();
    expect(result.platform).toBe('zhihu');
    expect(result.platformName).toBe('知乎');
    expect(result.sourceName).toBe('zhihu-hot');
    expect(result.updatedAt).toBeDefined();

    const first = result.items[0];
    expect(first.rank).toBe(1);
    expect(first.title).toBeDefined();
    expect(typeof first.title).toBe('string');
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.url).toBeDefined();
    expect(first.url).toContain('zhihu');
    expect(first.createdAt).toBeDefined();
    expect(first.updatedAt).toBeDefined();
  });

  it('fetchMock 应该包含知乎风格的标题（"如何看待XXX"）', async () => {
    const result = await adapter.fetchHotList();
    const howToViewItems = result.items.filter((item) => item.title.includes('如何看待'));
    expect(howToViewItems.length).toBeGreaterThanOrEqual(3);
  });

  it('fetchMock 应该有部分条目的 heat 为 null（至少 2 条）', async () => {
    const result = await adapter.fetchHotList();
    const nullHeatItems = result.items.filter((item) => item.heat === null);
    expect(nullHeatItems.length).toBeGreaterThanOrEqual(2);
  });

  it('fetchMock 的 heat 应为字符串格式的热度（如"1000万热度"）', async () => {
    const result = await adapter.fetchHotList();
    const heatItems = result.items.filter((item) => item.heat !== null);
    expect(heatItems.length).toBeGreaterThan(0);
    for (const item of heatItems) {
      expect(item.heat).toMatch(/万热度$/);
    }
  });

  it('fetchMock 应该包含 summary 字段', async () => {
    const result = await adapter.fetchHotList();
    const hasSummary = result.items.filter((item) => item.summary != null);
    expect(hasSummary.length).toBeGreaterThanOrEqual(5);
  });

  it('ZHIHU_API_URL 设为空字符串时应该走 Mock', async () => {
    process.env.ZHIHU_API_URL = '';
    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(20);
    expect(result.platform).toBe('zhihu');
  });

  it('fetchFromRemote 在网络错误时应抛出 UPSTREAM_ERROR', async () => {
    process.env.ZHIHU_API_URL = 'https://api.example.com/zhihu';

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection timeout')));

    try {
      await adapter.fetchHotList();
      expect.unreachable('应该抛出 AppError');
    } catch (err: any) {
      expect(err.code).toBe('UPSTREAM_ERROR');
      expect(err.statusCode).toBe(502);
      expect(err.message).toContain('知乎热榜获取失败');
    }
  });

  it('fetchFromRemote 在 HTTP 错误时应抛出 UPSTREAM_ERROR', async () => {
    process.env.ZHIHU_API_URL = 'https://api.example.com/zhihu';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );

    try {
      await adapter.fetchHotList();
      expect.unreachable('应该抛出 AppError');
    } catch (err: any) {
      expect(err.code).toBe('UPSTREAM_ERROR');
      expect(err.statusCode).toBe(502);
      expect(err.message).toContain('知乎热榜获取失败');
    }
  });

  it('fetchFromRemote 在实际数据为空时应该返回空 items', async () => {
    process.env.ZHIHU_API_URL = 'https://api.example.com/zhihu';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      }),
    );

    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(0);
  });

  it('fetchFromRemote 应携带移动端 User-Agent 和 Referer', async () => {
    process.env.ZHIHU_API_URL = 'https://api.example.com/zhihu';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await adapter.fetchHotList();

    const callHeaders = mockFetch.mock.calls[0][1]?.headers;
    expect(callHeaders['User-Agent']).toContain('iPhone');
    expect(callHeaders['Referer']).toBe('https://www.zhihu.com/hot');
  });

  it('fetchFromRemote 应正确映射真实 API 字段', async () => {
    process.env.ZHIHU_API_URL = 'https://api.example.com/zhihu';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              target: {
                title_area: { text: '知乎热搜标题' },
                metrics_area: { text: '912 万热度' },
                excerpt_area: { text: '摘要内容' },
                link: { url: 'https://www.zhihu.com/question/123' },
              },
              card_label: { type: 'hot' },
            },
            {
              target: {
                title_area: { text: '普通问题' },
                metrics_area: { text: '50 万热度' },
                link: { url: 'https://www.zhihu.com/question/456' },
              },
            },
          ],
        }),
      }),
    );

    const result = await adapter.fetchHotList();
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe('知乎热搜标题');
    expect(result.items[0].heat).toBe('912 万热度');
    expect(result.items[0].summary).toBe('摘要内容');
    expect(result.items[0].url).toContain('zhihu.com/question/123');
    expect(result.items[0].tag).toBe('热');
    expect(result.items[1].tag).toBeUndefined();
  });
});
