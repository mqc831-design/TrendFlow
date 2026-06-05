import { HotList } from '@shared/types';
import { IAdapter } from './IAdapter.js';
import { AppError } from '../middleware/errorHandler.js';

interface BilibiliRawItem {
  bvid?: string;
  title?: string;
  stat?: { view?: number };
  pubdate?: number;
}

class BilibiliAdapter implements IAdapter {
  readonly platform = 'bilibili' as const;
  readonly platformName = 'B站';
  readonly sourceName = 'bilibili-hot';

  private get apiUrl(): string {
    const envUrl = process.env.BILIBILI_API_URL;
    if (envUrl !== undefined) return envUrl;
    return 'https://api.bilibili.com/x/web-interface/popular';
  }

  async fetchHotList(): Promise<HotList> {
    if (this.apiUrl) {
      return this.fetchFromRemote();
    }
    return this.fetchMock();
  }

  private async fetchFromRemote(): Promise<HotList> {
    if (process.env.MOCK_FAIL_BILIBILI === 'true') {
      throw new AppError(502, 'MOCK_FAILURE', '模拟B站热榜接口故障');
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
          'Referer': 'https://m.bilibili.com/',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw: { code: number; data: { list?: BilibiliRawItem[] } } = await response.json();
      const now = new Date().toISOString();

      // API字段映射: bvid→url(拼接), title→title, stat.view→heat(播放量→万播放), pubdate(秒级时间戳)→createdAt
      const items = (raw.data?.list || []).slice(0, 50).map((item, index) => ({
        rank: index + 1,
        title: item.title ?? '(无标题)',
        url: item.bvid
          ? `https://www.bilibili.com/video/${item.bvid}`
          : `https://search.bilibili.com/all?keyword=${encodeURIComponent(item.title || '')}`,
        heat: item.stat?.view != null ? `${(item.stat.view / 10000).toFixed(1)} 万播放` : null,
        createdAt: item.pubdate
          ? new Date(item.pubdate * 1000).toISOString()
          : now,
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
        throw new AppError(502, 'UPSTREAM_TIMEOUT', 'B站热榜请求超时(5s)', `URL: ${url}`);
      }
      const message = err instanceof Error ? err.message : '未知错误';
      throw new AppError(502, 'UPSTREAM_ERROR', `B站热榜获取失败: ${message}`, `URL: ${url}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private fetchMock(): Promise<HotList> {
    const now = new Date().toISOString();
    const mockVideos = [
      '【4K】某城市航拍大片',
      '搞笑合集：笑得停不下来',
      '鬼畜全明星：年度最佳',
      '【教程】30天学会吉他',
      '美食探店：隐藏在小巷里的米其林',
      '翻唱挑战：原来你也唱过这首歌',
      'VLOG：我的一天日常',
      '纪录片：走进AI的世界',
      '游戏实况：速通世界纪录',
      '舞蹈挑战：全网最火的舞步',
      '科普：黑洞里面有什么？',
      '漫剪：进击的巨人名场面',
      '翻唱：最近超火的歌曲',
      '搞笑配音：当动物会说话',
      '手工教程：用纸箱做城堡',
      '游戏杂谈：年度最佳游戏评选',
      '绘画过程：一幅画卖了100万',
      '科技评测：最新款手机开箱',
      '吃播合集：挑战100个汉堡',
      '健身教程：7天练出腹肌',
    ];

    const items = mockVideos.map((title, i) => ({
      rank: i + 1,
      title,
      url: `https://www.bilibili.com/video/BV1${String.fromCharCode(65 + (i % 26))}${String(Math.random()).slice(2, 8)}`,
      heat: i < 17 ? `${(Math.random() * 500 + 10).toFixed(1)} 万播放` : null,
      summary: i % 4 === 0 ? `一个关于${title.slice(0, 5)}的精彩视频` : undefined,
      tag: i === 0 ? '热' : i === 1 ? '新' : i === 2 ? '荐' : undefined,
      createdAt: new Date(Date.now() - i * 1800000).toISOString(),
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

export { BilibiliAdapter };
