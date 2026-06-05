import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HotList, Platform } from '@shared/types';

// Mock configService — 必须在所有 import 之前
const mockConfigGet = vi.fn().mockReturnValue({ cacheTTL: 300 });
vi.mock('../configService.js', () => ({
  configService: {
    get: () => mockConfigGet(),
  },
}));

// Mock adapterFactory
const mockFetchHotList = vi.fn();
vi.mock('../../adapters/adapterFactory.js', () => ({
  getAdapter: (platform: Platform) => ({
    platform,
    platformName: { weibo: '微博', zhihu: '知乎', bilibili: 'B站' }[platform],
    sourceName: 'test',
    fetchHotList: () => mockFetchHotList(platform),
  }),
}));

import { cacheService } from '../cacheService.js';

function makeHotList(platform: Platform, overrides: Partial<HotList> = {}): HotList {
  return {
    platform,
    platformName: { weibo: '微博', zhihu: '知乎', bilibili: 'B站' }[platform],
    sourceName: 'test',
    updatedAt: new Date().toISOString(),
    items: [],
    ...overrides,
  };
}

describe('cacheService', () => {
  beforeEach(() => {
    // 清空 cacheService 内部 store（通过暴力方式：创建多个 platform 的 set/get 循环）
    // 使用私有属性访问来清空 store
    (cacheService as any).store.clear();
    vi.clearAllMocks();
    mockConfigGet.mockReturnValue({ cacheTTL: 300 });
  });

  describe('set / get', () => {
    it('set 后 get 应返回相同数据', () => {
      const data = makeHotList('weibo', { items: [{ rank: 1, title: '测试', url: 'http://a.com', createdAt: '', updatedAt: '' }] });
      cacheService.set('weibo', data);
      expect(cacheService.get('weibo')).toEqual(data);
    });

    it('未 set 的平台 get 应返回 null', () => {
      expect(cacheService.get('zhihu')).toBeNull();
    });

    it('多次 set 同一平台应覆盖旧值', () => {
      const old = makeHotList('weibo', { sourceName: 'old' });
      const fresh = makeHotList('weibo', { sourceName: 'fresh' });
      cacheService.set('weibo', old);
      cacheService.set('weibo', fresh);
      expect(cacheService.get('weibo')?.sourceName).toBe('fresh');
    });

    it('不同平台的缓存应独立', () => {
      const weibo = makeHotList('weibo');
      const zhihu = makeHotList('zhihu');
      cacheService.set('weibo', weibo);
      cacheService.set('zhihu', zhihu);
      expect(cacheService.get('weibo')).toEqual(weibo);
      expect(cacheService.get('zhihu')).toEqual(zhihu);
      expect(cacheService.get('bilibili')).toBeNull();
    });
  });

  describe('isValid（通过 getOrFetch 间接验证）', () => {
    it('缓存未过期时应直接返回缓存，不调用 adapter', async () => {
      mockConfigGet.mockReturnValue({ cacheTTL: 9999 }); // 极长 TTL
      const data = makeHotList('weibo');
      cacheService.set('weibo', data);

      const result = await cacheService.getOrFetch('weibo');

      expect(result).toEqual(data); // 返回缓存原文
      expect(mockFetchHotList).not.toHaveBeenCalled(); // 不调 adapter
    });

    it('缓存过期后应调用 adapter 获取新数据', async () => {
      mockConfigGet.mockReturnValue({ cacheTTL: 0 }); // TTL=0，立即过期
      const old = makeHotList('weibo', { sourceName: 'old' });
      cacheService.set('weibo', old);

      const fresh = makeHotList('weibo', { sourceName: 'fresh' });
      mockFetchHotList.mockResolvedValueOnce(fresh);

      const result = await cacheService.getOrFetch('weibo');

      expect(result).toEqual(fresh);
      expect(mockFetchHotList).toHaveBeenCalledWith('weibo');
    });

    it('TTL 边界：刚好在 TTL 内应命中缓存', async () => {
      mockConfigGet.mockReturnValue({ cacheTTL: 10 }); // 10 秒 TTL
      const data = makeHotList('weibo');
      cacheService.set('weibo', data);

      // 刚 set 完立即 get，肯定在 TTL 内
      const result = await cacheService.getOrFetch('weibo');
      expect(result).toEqual(data);
      expect(mockFetchHotList).not.toHaveBeenCalled();
    });

    it('TTL 修改后应影响 isValid 判定', async () => {
      // 先用长 TTL 缓存，再调短 TTL
      mockConfigGet.mockReturnValue({ cacheTTL: 9999 });
      const data = makeHotList('weibo');
      cacheService.set('weibo', data);

      // 改成短 TTL=0
      mockConfigGet.mockReturnValue({ cacheTTL: 0 });
      const fresh = makeHotList('weibo', { sourceName: 'from-adapter' });
      mockFetchHotList.mockResolvedValueOnce(fresh);

      const result = await cacheService.getOrFetch('weibo');
      expect(result).toEqual(fresh);
      expect(mockFetchHotList).toHaveBeenCalled();
    });
  });

  describe('getOrFetch', () => {
    it('无缓存时调用 adapter 成功应返回数据并缓存', async () => {
      const data = makeHotList('zhihu');
      mockFetchHotList.mockResolvedValueOnce(data);

      const result = await cacheService.getOrFetch('zhihu');

      expect(result).toEqual(data);
      expect(cacheService.get('zhihu')).toEqual(data);
    });

    it('adapter 失败 + 有旧缓存 → 返回旧缓存 + error=true', async () => {
      mockConfigGet.mockReturnValue({ cacheTTL: 9999 });
      const stale = makeHotList('bilibili', { sourceName: 'stale' });
      cacheService.set('bilibili', stale);

      // 设置 TTL=0 让缓存失效以触发 adapter
      mockConfigGet.mockReturnValue({ cacheTTL: 0 });
      mockFetchHotList.mockRejectedValueOnce(new Error('Network Error'));

      const result = await cacheService.getOrFetch('bilibili');

      expect(result.platform).toBe('bilibili');
      expect(result.error).toBe(true);
      expect(result.message).toBe('上游接口请求失败，当前显示的是缓存数据');
      expect(result.sourceName).toBe('stale'); // 保留了旧缓存字段
    });

    it('adapter 失败 + 无缓存 → 返回空 items + error=true + message', async () => {
      mockFetchHotList.mockRejectedValueOnce(new Error('Network Error'));

      const result = await cacheService.getOrFetch('zhihu');

      expect(result.platform).toBe('zhihu');
      expect(result.error).toBe(true);
      expect(result.message).toBe('数据获取失败，请稍后重试');
      expect(result.items).toEqual([]);
      expect(result.platformName).toBe('知乎');
    });
  });

  describe('getOrFetchAll', () => {
    it('应并行获取多个平台的数据', async () => {
      const weibo = makeHotList('weibo');
      const zhihu = makeHotList('zhihu');
      const bilibili = makeHotList('bilibili');
      mockFetchHotList
        .mockResolvedValueOnce(weibo)
        .mockResolvedValueOnce(zhihu)
        .mockResolvedValueOnce(bilibili);

      const results = await cacheService.getOrFetchAll(['weibo', 'zhihu', 'bilibili']);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(weibo);
      expect(results[1]).toEqual(zhihu);
      expect(results[2]).toEqual(bilibili);
      expect(mockFetchHotList).toHaveBeenCalledTimes(3);
    });

    it('部分失败时成功平台正常返回，失败平台返回 error', async () => {
      const weibo = makeHotList('weibo');
      mockFetchHotList
        .mockResolvedValueOnce(weibo)
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce(makeHotList('bilibili'));

      const results = await cacheService.getOrFetchAll(['weibo', 'zhihu', 'bilibili']);

      expect(results).toHaveLength(3);
      expect(results[0].platform).toBe('weibo');
      expect(results[0].error).toBeUndefined();

      expect(results[1].platform).toBe('zhihu');
      expect(results[1].error).toBe(true);

      expect(results[2].platform).toBe('bilibili');
      expect(results[2].error).toBeUndefined();
    });
  });

  describe('refreshAll', () => {
    it('全部成功时应更新缓存并返回数据', async () => {
      const weibo = makeHotList('weibo', { sourceName: 'fresh-weibo' });
      const zhihu = makeHotList('zhihu', { sourceName: 'fresh-zhihu' });
      mockFetchHotList.mockResolvedValueOnce(weibo).mockResolvedValueOnce(zhihu);

      const results = await cacheService.refreshAll(['weibo', 'zhihu']);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(weibo);
      expect(results[1]).toEqual(zhihu);
      // 缓存应被更新
      expect(cacheService.get('weibo')?.sourceName).toBe('fresh-weibo');
      expect(cacheService.get('zhihu')?.sourceName).toBe('fresh-zhihu');
    });

    it('部分失败 + 有旧缓存 → 返回旧缓存 + error=true', async () => {
      const stale = makeHotList('zhihu', { sourceName: 'stale-zhihu' });
      cacheService.set('zhihu', stale);

      mockFetchHotList
        .mockResolvedValueOnce(makeHotList('weibo'))
        .mockRejectedValueOnce(new Error('Fail'));

      const results = await cacheService.refreshAll(['weibo', 'zhihu']);

      expect(results[0].platform).toBe('weibo');
      expect(results[0].error).toBeUndefined();

      expect(results[1].platform).toBe('zhihu');
      expect(results[1].error).toBe(true);
      expect(results[1].message).toBe('刷新失败，当前显示的是缓存数据');
    });

    it('部分失败 + 无旧缓存 → 返回空数据 + error=true', async () => {
      mockFetchHotList.mockRejectedValueOnce(new Error('Fail'));

      const results = await cacheService.refreshAll(['bilibili']);

      expect(results).toHaveLength(1);
      expect(results[0].platform).toBe('bilibili');
      expect(results[0].error).toBe(true);
      expect(results[0].message).toBe('刷新失败，请稍后重试');
      expect(results[0].items).toEqual([]);
    });
  });

  describe('adapterName 映射', () => {
    it('weibo → 微博', async () => {
      mockFetchHotList.mockRejectedValueOnce(new Error('x'));
      const r = await cacheService.getOrFetch('weibo');
      expect(r.platformName).toBe('微博');
    });

    it('zhihu → 知乎', async () => {
      mockFetchHotList.mockRejectedValueOnce(new Error('x'));
      const r = await cacheService.getOrFetch('zhihu');
      expect(r.platformName).toBe('知乎');
    });

    it('bilibili → B站', async () => {
      mockFetchHotList.mockRejectedValueOnce(new Error('x'));
      const r = await cacheService.getOrFetch('bilibili');
      expect(r.platformName).toBe('B站');
    });
  });
});
