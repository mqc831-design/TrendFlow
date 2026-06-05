import { HotList, Platform } from '@shared/types';
import { getAdapter } from '../adapters/adapterFactory.js';
import { configService } from './configService.js';

interface CacheEntry {
  data: HotList;
  timestamp: number;
}

class CacheService {
  private store = new Map<Platform, CacheEntry>();

  private getTTL(): number {
    const envTTL = process.env.CACHE_TTL;
    if (envTTL) {
      const parsed = parseInt(envTTL, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return configService.get().cacheTTL;
  }

  private isValid(platform: Platform): boolean {
    const entry = this.store.get(platform);
    if (!entry) return false;
    const ttl = this.getTTL() * 1000;
    return Date.now() - entry.timestamp < ttl;
  }

  get(platform: Platform): HotList | null {
    return this.store.get(platform)?.data ?? null;
  }

  set(platform: Platform, data: HotList): void {
    this.store.set(platform, { data, timestamp: Date.now() });
  }

  async getOrFetch(platform: Platform, forceRefresh?: boolean): Promise<HotList> {
    if (!forceRefresh && this.isValid(platform)) {
      console.log(`[cache hit] ${platform}`);
      return this.get(platform)!;
    }

    console.log(`[cache miss] ${platform}`);

    try {
      const adapter = getAdapter(platform);
      const data = await adapter.fetchHotList();
      this.set(platform, data);
      return data;
    } catch (err) {
      console.warn(`[cache] ${platform} 获取失败:`, err instanceof Error ? err.message : err);
      const stale = this.get(platform);
      if (stale) {
        return { ...stale, error: true, message: '上游接口请求失败，当前显示的是缓存数据' };
      }
      return {
        platform,
        platformName: adapterName(platform),
        sourceName: '',
        updatedAt: new Date().toISOString(),
        items: [],
        error: true,
        message: '数据获取失败，请稍后重试',
      };
    }
  }

  async getOrFetchAll(platforms: Platform[], forceRefresh?: boolean): Promise<HotList[]> {
    return Promise.all(platforms.map((p) => this.getOrFetch(p, forceRefresh)));
  }

  async refreshAll(platforms: Platform[]): Promise<HotList[]> {
    const results = await Promise.allSettled(
      platforms.map(async (p) => {
        const adapter = getAdapter(p);
        const data = await adapter.fetchHotList();
        this.set(p, data);
        return data;
      }),
    );

    return results.map((r, index) => {
      const platform = platforms[index];
      if (r.status === 'fulfilled') return r.value;

      const stale = this.get(platform);
      if (stale) {
        return { ...stale, error: true, message: '刷新失败，当前显示的是缓存数据' };
      }
      return {
        platform,
        platformName: adapterName(platform),
        sourceName: '',
        updatedAt: new Date().toISOString(),
        items: [],
        error: true,
        message: '刷新失败，请稍后重试',
      };
    });
  }
}

function adapterName(p: Platform): string {
  const map: Record<Platform, string> = { weibo: '微博', zhihu: '知乎', bilibili: 'B站' };
  return map[p];
}

export const cacheService = new CacheService();
