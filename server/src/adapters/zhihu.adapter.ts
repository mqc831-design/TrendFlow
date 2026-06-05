import { HotList } from '@shared/types';
import { IAdapter } from './IAdapter.js';
import { AppError } from '../middleware/errorHandler.js';

interface ZhihuRawItem {
  target?: {
    title_area?: { text?: string };
    excerpt_area?: { text?: string };
    metrics_area?: { text?: string };
    link?: { url?: string };
  };
  card_label?: { type?: string };
}

class ZhihuAdapter implements IAdapter {
  readonly platform = 'zhihu' as const;
  readonly platformName = '知乎';
  readonly sourceName = 'zhihu-hot';

  private get apiUrl(): string {
    const envUrl = process.env.ZHIHU_API_URL;
    if (envUrl !== undefined) return envUrl;
    return 'https://www.zhihu.com/api/v3/feed/topstory/hot-list-web?limit=50';
  }

  async fetchHotList(): Promise<HotList> {
    if (this.apiUrl) {
      return this.fetchFromRemote();
    }
    return this.fetchMock();
  }

  private async fetchFromRemote(): Promise<HotList> {
    if (process.env.MOCK_FAIL_ZHIHU === 'true') {
      throw new AppError(502, 'MOCK_FAILURE', '模拟知乎热榜接口故障');
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
          'Referer': 'https://www.zhihu.com/hot',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw: { data: ZhihuRawItem[] } = await response.json();
      const now = new Date().toISOString();

      // API字段映射: target.title_area.text→title, target.link.url→url, target.metrics_area.text→heat, target.excerpt_area.text→summary, card_label.type→tag
      const items = (raw.data || []).slice(0, 50).map((item, index) => ({
        rank: index + 1,
        title: item.target?.title_area?.text ?? '(无标题)',
        url: item.target?.link?.url ?? `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(item.target?.title_area?.text || '')}`,
        heat: item.target?.metrics_area?.text ?? null,
        summary: item.target?.excerpt_area?.text ?? undefined,
        tag: item.card_label?.type === 'hot' ? '热' : undefined,
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
        throw new AppError(502, 'UPSTREAM_TIMEOUT', '知乎热榜请求超时(5s)', `URL: ${url}`);
      }
      const message = err instanceof Error ? err.message : '未知错误';
      throw new AppError(502, 'UPSTREAM_ERROR', `知乎热榜获取失败: ${message}`, `URL: ${url}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private fetchMock(): Promise<HotList> {
    const now = new Date().toISOString();
    const mockQuestions = [
      '如何看待 XXX 事件的最新进展？',
      '为什么 AI 技术最近这么火？',
      '有哪些值得推荐的学习方法？',
      '房价还会继续下跌吗？',
      '如何评价 XX 新上映的电影？',
      '工作三年后要不要考研？',
      '有哪些冷门但好用的工具推荐？',
      '如何看待年轻人躺平现象？',
      '副业月入过万是真的吗？',
      '新能源汽车到底值不值得买？',
      '35岁真的是职场天花板吗？',
      '如何看待远程办公的趋势？',
      '有哪些高效的代码编辑器推荐？',
      '量子计算会改变我们的生活吗？',
      '如何看待最近的股市波动？',
      'TypeScript 和 JavaScript 怎么选？',
      '自由职业者如何管理时间？',
      '人工智能会取代程序员吗？',
      '如何提高英语口语水平？',
      '有哪些适合新手的投资方式？',
    ];

    const items = mockQuestions.map((title, i) => ({
      rank: i + 1,
      title,
      url: `https://www.zhihu.com/question/${10000000 + i}`,
      heat: i < 18 ? `${(Math.random() * 2000 + 100).toFixed(0)} 万热度` : null,
      summary: i % 3 === 0 ? `近期${title.slice(0, 10)}相关话题引发广泛讨论……` : undefined,
      tag: i === 0 ? '热' : i === 1 ? '新' : i === 2 ? '荐' : undefined,
      createdAt: new Date(Date.now() - (20 - i) * 3600000).toISOString(),
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

export { ZhihuAdapter };
