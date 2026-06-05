import { HotList } from '@shared/types';
import { IAdapter } from './IAdapter.js';
import { AppError } from '../middleware/errorHandler.js';

interface WeiboRawItem {
  word: string;
  num: number;
  realpos: number;
  label_name?: string;
  word_scheme?: string;
  is_ad?: number;
}

class WeiboAdapter implements IAdapter {
  readonly platform = 'weibo' as const;
  readonly platformName = '微博';
  readonly sourceName = 'weibo-hot-search';

  private get apiUrl(): string {
    const envUrl = process.env.WEIBO_API_URL;
    if (envUrl !== undefined) return envUrl;
    return 'https://weibo.com/ajax/side/hotSearch';
  }

  async fetchHotList(): Promise<HotList> {
    if (this.apiUrl) {
      return this.fetchFromRemote();
    }
    return this.fetchMock();
  }

  private async fetchFromRemote(): Promise<HotList> {
    if (process.env.MOCK_FAIL_WEIBO === 'true') {
      throw new AppError(502, 'MOCK_FAILURE', '模拟微博热榜接口故障');
    }

    const url = this.apiUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          'Referer': 'https://weibo.com/',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw: { ok: number; data: { realtime: WeiboRawItem[] } } = await response.json();
      const now = new Date().toISOString();

      // API字段映射: realpos→rank, word→title, num→heat, label_name→tag, word_scheme→构造搜索URL
      const items = (raw.data?.realtime || [])
        .filter((item) => !item.is_ad)
        .slice(0, 50)
        .map((item) => ({
          rank: item.realpos,
          title: item.word,
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`,
          heat: item.num != null ? String(item.num) : null,
          tag: item.label_name || undefined,
          createdAt: now,
          updatedAt: now,
        }));

      return {
        platform: this.platform,
        platformName: this.platformName,
        sourceName: this.sourceName,
        updatedAt: now,
        items,
      };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new AppError(502, 'UPSTREAM_TIMEOUT', '微博热榜请求超时(5s)', `URL: ${url}`);
      }
      const message = err instanceof Error ? err.message : '未知错误';
      throw new AppError(502, 'UPSTREAM_ERROR', `微博热榜获取失败: ${message}`, `URL: ${url}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private fetchMock(): Promise<HotList> {
    const now = new Date().toISOString();
    const mockTitles = [
      '某某明星官宣结婚',
      '某地发生5.2级地震',
      'AI技术突破：新模型达到人类水平',
      '高考第一天 各地作文题目出炉',
      'iPhone 20 发布会定档',
      'NBA总决赛第七场逆转',
      '国产大飞机C919完成首次商业飞行',
      '科学家发现新型室温超导材料',
      '全球股市迎来大幅反弹',
      '某知名导演新片票房破50亿',
      '教育部发布双减新政策',
      '某互联网大厂裁员30%',
      '量子计算机实现新里程碑',
      '新能源汽车销量再创新高',
      '某地发现大型金矿',
      '冬奥会开幕式导演团队公布',
      '全球首款核聚变电池发布',
      '某大学排名跃居世界前十',
      '极端天气预警：台风即将登陆',
      '首个火星样本返回任务成功',
    ];
    const tags = ['热', '爆', '新', '荐', '沸', '热', '新', '荐', '热', '爆'];

    const items = mockTitles.map((title, i) => ({
      rank: i + 1,
      title,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(title)}`,
      heat: i < 17 ? String(Math.floor(Math.random() * 2000000) + 100000) : null,
      tag: i < 10 ? tags[i] : undefined,
      createdAt: now,
      updatedAt: now,
    }));

    return Promise.resolve({
      platform: this.platform,
      platformName: this.platformName,
      sourceName: this.sourceName,
      updatedAt: now,
      items,
    });
  }
}

export { WeiboAdapter };
