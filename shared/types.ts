// ============================================================
// shared/types.ts — 前后端共用类型定义
// ============================================================

/** 平台标识 */
export type Platform = 'weibo' | 'zhihu' | 'bilibili';

/** 热榜条目 */
export interface HotItem {
  rank: number;
  title: string;
  url: string;
  heat?: string | null;
  summary?: string;
  tag?: string;
  createdAt: string;
  updatedAt: string;
}

/** 前端扩展：关键字匹配结果 */
export interface HotItemMatched extends HotItem {
  matched?: boolean;
  highlightedTitle?: string;
}

/** 平台榜单 */
export interface HotList {
  platform: Platform;
  platformName: string;
  sourceName: string;
  updatedAt: string;
  items: HotItem[];
  error?: boolean;
  message?: string;
}

/** 聚合接口响应 */
export interface HotListResponse {
  updatedAt: string;
  cache: {
    hit: boolean;
    ttl: number;
  };
  data: HotList[];
}

/** 应用配置 */
export interface AppConfig {
  keywords: string[];
  matchMode: 'any' | 'all' | 'exclude';
  sources: Record<Platform, boolean>;
  topN: 10 | 20 | 30;
  refreshMode: 'manual' | 'scheduled' | 'both';
  scheduledTime: string;
  cacheTTL: number;
}

/** 配置更新请求体（所有字段可选） */
export type AppConfigPartial = Partial<AppConfig>;

/** 统一错误响应 */
export interface ErrorResponse {
  error: true;
  code: string;
  message: string;
  details?: string;
}
