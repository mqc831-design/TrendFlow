# 今日热搜 · 详细设计文档

## 1. 文档说明

本文档基于 `proposal.md`（需求规格）和 `high-level-design.md`（概要设计），对系统 10 个模块逐一进行详细设计。每个模块包含：文件路径、函数签名、数据结构、处理逻辑、接口 JSON 示例（成功+失败）、边界条件和独立测试方式。

---

## 2. M1 — shared 共享类型

### 2.1 文件

```
shared/types.ts
```

### 2.2 引用方式

- **前端 client**：`tsconfig.json` 配置 `"paths": { "@shared/*": ["../shared/*"] }`，通过 `import { HotItem } from '@shared/types'` 引用
- **后端 server**：`tsconfig.json` 配置 `"paths": { "@shared/*": ["../shared/*"] }`，通过 `import { HotItem } from '@shared/types'` 引用

### 2.3 类型定义

```ts
// ============================================================
// shared/types.ts — 前后端共用类型定义
// ============================================================

/** 平台标识 */
type Platform = 'weibo' | 'zhihu' | 'bilibili';

/** 热榜条目 */
interface HotItem {
  rank: number;            // 排名 1～20
  title: string;           // 热搜标题
  url: string;             // 跳转到原平台的链接
  heat?: string | null;    // 热度值（可选）
  summary?: string;        // 摘要（可选）
  tag?: string;            // 标签：热/新/荐（可选）
  createdAt: string;       // 数据生成时间 ISO 8601
  updatedAt: string;       // 数据更新时间 ISO 8601
}

/** 前端扩展：关键字匹配结果 */
interface HotItemMatched extends HotItem {
  matched?: boolean;       // 是否命中关键字
  highlightedTitle?: string; // 关键字高亮后的 HTML 片段
}

/** 平台榜单 */
interface HotList {
  platform: Platform;
  platformName: string;    // "微博" | "知乎" | "B站"
  sourceName: string;      // 数据来源标识
  updatedAt: string;       // ISO 8601
  items: HotItem[];
  error?: boolean;         // 上游请求是否失败
  message?: string;        // 错误描述（仅 error=true 时有值）
}

/** 聚合接口响应 */
interface HotListResponse {
  updatedAt: string;       // 全局更新时间 ISO 8601
  cache: {
    hit: boolean;          // 是否命中缓存
    ttl: number;           // 剩余有效时间（秒）
  };
  data: HotList[];
}

/** 应用配置 */
interface AppConfig {
  keywords: string[];
  matchMode: 'any' | 'all' | 'exclude';
  sources: Record<Platform, boolean>;
  topN: 10 | 20 | 30;
  refreshMode: 'manual' | 'scheduled' | 'both';
  scheduledTime: string;  // "HH:mm" 格式
  cacheTTL: number;        // 秒
}

/** 配置更新请求体（所有字段可选） */
type AppConfigPartial = Partial<AppConfig>;

/** 统一错误响应 */
interface ErrorResponse {
  error: true;
  code: string;            // 错误码枚举值
  message: string;         // 面向用户的错误描述
  details?: string;        // 面向开发者的详细信息
}
```

### 2.4 独立测试

- 本模块为纯类型定义，无运行逻辑
- 验证方式：TypeScript 编译通过（前后端各自运行 `tsc --noEmit`），无类型错误

---

## 3. M10 — server/middleware 中间件

> 先写 M10 因为其他后端模块依赖中间件提供的错误处理能力。

### 3.1 文件

```
server/src/middleware/cors.ts
server/src/middleware/errorHandler.ts
server/src/middleware/configGuard.ts
```

### 3.2 cors 中间件

```ts
// server/src/middleware/cors.ts
import cors from 'cors';

const corsOptions: cors.CorsOptions = {
  origin: [
    'http://localhost:5173',        // Vite 开发服务器
    process.env.CLIENT_ORIGIN || '', // 生产环境前端域名（Vercel）
  ].filter(Boolean),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

export const corsMiddleware = cors(corsOptions);
```

### 3.3 errorHandler 中间件

```ts
// server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '@shared/types';

/** 标准化错误对象 */
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 统一错误处理中间件（4 参数签名） */
function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: true,
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  // 未预期的错误
  console.error('[ErrorHandler] 未预期错误:', err);
  res.status(500).json({
    error: true,
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误，请稍后重试',
  });
}

export { AppError, errorHandler };
```

**错误码枚举：**

| 错误码 | HTTP 状态码 | 场景 |
|---|---|---|
| `UPSTREAM_ERROR` | 502 | 第三方平台接口请求失败 |
| `PLATFORM_NOT_FOUND` | 404 | 请求了不存在的平台 |
| `CONFIG_INVALID` | 400 | 配置更新请求格式不合法 |
| `CONFIG_WRITE_DISABLED` | 403 | 生产环境禁止写入配置 |
| `INTERNAL_ERROR` | 500 | 服务内部未预期错误 |

### 3.4 configGuard 中间件

```ts
// server/src/middleware/configGuard.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/** 生产环境禁止 POST /api/config */
function configGuard(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === 'POST' && process.env.NODE_ENV === 'production') {
    throw new AppError(
      403,
      'CONFIG_WRITE_DISABLED',
      '生产环境禁止通过 API 修改配置，请通过环境变量或配置文件管理',
    );
  }
  next();
}

export { configGuard };
```

### 3.5 独立测试

| 测试对象 | 测试方式 |
|---|---|
| cors | 从不同 origin 发起请求，验证跨域头 |
| errorHandler | 构造 AppError 传入 next()，验证响应体格式和状态码 |
| configGuard | 设置 NODE_ENV=production，POST /api/config，验证返回 403 |

---

## 4. M7 — server/routes 路由层

### 4.1 文件

```
server/src/routes/hot.ts
server/src/routes/config.ts
server/src/routes/index.ts    # 路由汇总挂载
```

### 4.2 路由注册

```ts
// server/src/routes/index.ts
import { Router } from 'express';
import { hotRouter } from './hot';
import { configRouter } from './config';
import { configGuard } from '../middleware/configGuard';

const apiRouter = Router();

apiRouter.use('/hot-lists', hotRouter);
apiRouter.use('/config', configGuard, configRouter);

export { apiRouter };
```

### 4.3 热榜路由 — hot.ts

```ts
// server/src/routes/hot.ts
import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { configService } from '../services/configService';
import { AppError } from '../middleware/errorHandler';

const hotRouter = Router();

// GET /api/hot-lists
hotRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = configService.get();
    const enabledPlatforms = (Object.keys(config.sources) as Platform[])
      .filter((k) => config.sources[k]);

    const results = await cacheService.getOrFetchAll(enabledPlatforms);

    // 按 topN 截断
    const data = results.map((list) => ({
      ...list,
      items: list.items.slice(0, config.topN),
    }));

    res.json({
      updatedAt: new Date().toISOString(),
      cache: { hit: results.every((r) => !r.error), ttl: config.cacheTTL },
      data,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/hot-lists/:platform
hotRouter.get('/:platform', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = req.params;
    const validPlatforms: Platform[] = ['weibo', 'zhihu', 'bilibili'];

    if (!validPlatforms.includes(platform as Platform)) {
      throw new AppError(404, 'PLATFORM_NOT_FOUND', `平台 "${platform}" 不存在`);
    }

    const config = configService.get();
    const result = await cacheService.getOrFetch(platform as Platform);

    res.json({
      ...result,
      items: result.items.slice(0, config.topN),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/refresh
hotRouter.post('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = configService.get();
    const enabledPlatforms = (Object.keys(config.sources) as Platform[])
      .filter((k) => config.sources[k]);

    const results = await cacheService.refreshAll(enabledPlatforms);

    const data = results.map((list) => ({
      ...list,
      items: list.items.slice(0, config.topN),
    }));

    res.json({
      updatedAt: new Date().toISOString(),
      cache: { hit: false, ttl: config.cacheTTL },
      data,
    });
  } catch (err) {
    next(err);
  }
});

export { hotRouter };
```

**注意**：POST /api/refresh 映射到 `POST /api/hot-lists`（因为路由挂载在 `/hot-lists` 下），修正为独立路由 `/api/refresh`。需在路由注册时单独处理。

修正后的路由注册：

```ts
// server/src/routes/index.ts
import { Router } from 'express';
import { hotRouter } from './hot';
import { configRouter } from './config';
import { configGuard } from '../middleware/configGuard';
import { cacheService } from '../services/cacheService';
import { configService } from '../services/configService';

const apiRouter = Router();

apiRouter.use('/hot-lists', hotRouter);      // GET /api/hot-lists, GET /api/hot-lists/:platform
apiRouter.use('/config', configGuard, configRouter); // GET/POST /api/config

// POST /api/refresh — 独立路径
apiRouter.post('/refresh', async (req, res, next) => {
  try {
    const config = configService.get();
    const enabledPlatforms = (Object.keys(config.sources) as Platform[])
      .filter((k) => config.sources[k]);
    const results = await cacheService.refreshAll(enabledPlatforms);
    const data = results.map((list) => ({
      ...list,
      items: list.items.slice(0, config.topN),
    }));
    res.json({
      updatedAt: new Date().toISOString(),
      cache: { hit: false, ttl: config.cacheTTL },
      data,
    });
  } catch (err) {
    next(err);
  }
});

export { apiRouter };
```

### 4.4 配置路由 — config.ts

```ts
// server/src/routes/config.ts
import { Router, Request, Response, NextFunction } from 'express';
import { configService } from '../services/configService';
import { AppError } from '../middleware/errorHandler';
import { AppConfigPartial } from '@shared/types';

const configRouter = Router();

// GET /api/config
configRouter.get('/', (_req: Request, res: Response) => {
  const config = configService.get();
  res.json(config);
});

// POST /api/config
configRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body: AppConfigPartial = req.body;

    // 基础校验
    if (body.topN !== undefined && ![10, 20, 30].includes(body.topN)) {
      throw new AppError(400, 'CONFIG_INVALID', 'topN 必须为 10、20 或 30');
    }
    if (body.matchMode && !['any', 'all', 'exclude'].includes(body.matchMode)) {
      throw new AppError(400, 'CONFIG_INVALID', 'matchMode 必须为 any、all 或 exclude');
    }
    if (body.cacheTTL !== undefined && (body.cacheTTL < 60 || body.cacheTTL > 3600)) {
      throw new AppError(400, 'CONFIG_INVALID', 'cacheTTL 必须在 60～3600 秒之间');
    }

    const updated = configService.update(body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export { configRouter };
```

### 4.5 接口 JSON 示例

#### GET /api/hot-lists — 成功

```json
{
  "updatedAt": "2026-06-03T10:30:00.000Z",
  "cache": { "hit": true, "ttl": 245 },
  "data": [
    {
      "platform": "weibo",
      "platformName": "微博",
      "sourceName": "weibo-hot-search",
      "updatedAt": "2026-06-03T10:28:00.000Z",
      "error": false,
      "items": [
        {
          "rank": 1,
          "title": "某某明星官宣结婚",
          "url": "https://s.weibo.com/weibo?q=%E6%9F%90%E6%9F%90",
          "heat": "1234567",
          "tag": "热",
          "createdAt": "2026-06-03T10:25:00.000Z",
          "updatedAt": "2026-06-03T10:28:00.000Z"
        },
        {
          "rank": 2,
          "title": "某地发生地震",
          "url": "https://s.weibo.com/weibo?q=%E5%9C%B0%E9%9C%87",
          "heat": "987654",
          "tag": "爆",
          "createdAt": "2026-06-03T10:20:00.000Z",
          "updatedAt": "2026-06-03T10:28:00.000Z"
        }
      ]
    },
    {
      "platform": "zhihu",
      "platformName": "知乎",
      "sourceName": "zhihu-hot",
      "updatedAt": "2026-06-03T10:29:00.000Z",
      "error": false,
      "items": [
        {
          "rank": 1,
          "title": "如何看待 XXX 事件的最新进展？",
          "url": "https://www.zhihu.com/question/12345678",
          "heat": "1000 万热度",
          "tag": null,
          "createdAt": "2026-06-03T08:15:00.000Z",
          "updatedAt": "2026-06-03T10:29:00.000Z"
        },
        {
          "rank": 2,
          "title": "为什么 XXX 技术最近这么火？",
          "url": "https://www.zhihu.com/question/87654321",
          "heat": "800 万热度",
          "summary": "近期XXX技术在各大社区引发广泛讨论……",
          "createdAt": "2026-06-03T09:00:00.000Z",
          "updatedAt": "2026-06-03T10:29:00.000Z"
        }
      ]
    },
    {
      "platform": "bilibili",
      "platformName": "B站",
      "sourceName": "bilibili-hot",
      "updatedAt": "2026-06-03T10:27:00.000Z",
      "error": false,
      "items": [
        {
          "rank": 1,
          "title": "【4K】某城市航拍大片",
          "url": "https://www.bilibili.com/video/BV12345678",
          "heat": "200 万播放",
          "summary": "耗时三个月拍摄的城市航拍作品",
          "tag": "新",
          "createdAt": "2026-06-03T07:00:00.000Z",
          "updatedAt": "2026-06-03T10:27:00.000Z"
        }
      ]
    }
  ]
}
```

#### GET /api/hot-lists — 部分失败

```json
{
  "updatedAt": "2026-06-03T10:30:00.000Z",
  "cache": { "hit": false, "ttl": 300 },
  "data": [
    {
      "platform": "weibo",
      "platformName": "微博",
      "sourceName": "weibo-hot-search",
      "updatedAt": "2026-06-03T09:50:00.000Z",
      "error": false,
      "items": [ /* ...正常数据... */ ]
    },
    {
      "platform": "zhihu",
      "platformName": "知乎",
      "sourceName": "zhihu-hot",
      "updatedAt": "2026-06-03T09:55:00.000Z",
      "error": true,
      "message": "上游接口请求超时，当前显示的是上一次缓存数据",
      "items": [ /* ...最后一次可用缓存数据... */ ]
    },
    {
      "platform": "bilibili",
      "platformName": "B站",
      "sourceName": "bilibili-hot",
      "updatedAt": "2026-06-03T10:27:00.000Z",
      "error": false,
      "items": [ /* ...正常数据... */ ]
    }
  ]
}
```

#### GET /api/hot-lists/zhihu — 成功

```json
{
  "platform": "zhihu",
  "platformName": "知乎",
  "sourceName": "zhihu-hot",
  "updatedAt": "2026-06-03T10:29:00.000Z",
  "error": false,
  "items": [
    {
      "rank": 1,
      "title": "如何看待 XXX 事件的最新进展？",
      "url": "https://www.zhihu.com/question/12345678",
      "heat": "1000 万热度",
      "createdAt": "2026-06-03T08:15:00.000Z",
      "updatedAt": "2026-06-03T10:29:00.000Z"
    }
  ]
}
```

#### GET /api/hot-lists/unknown — 失败

```json
{
  "error": true,
  "code": "PLATFORM_NOT_FOUND",
  "message": "平台 \"unknown\" 不存在"
}
```

#### POST /api/refresh — 成功

```json
{
  "updatedAt": "2026-06-03T10:31:00.000Z",
  "cache": { "hit": false, "ttl": 300 },
  "data": [
    /* ...三平台最新数据，格式同 GET /api/hot-lists 成功响应... */
  ]
}
```

#### GET /api/config — 成功

```json
{
  "keywords": ["AI", "安全"],
  "matchMode": "any",
  "sources": { "weibo": true, "zhihu": true, "bilibili": true },
  "topN": 20,
  "refreshMode": "both",
  "scheduledTime": "08:00",
  "cacheTTL": 300
}
```

#### POST /api/config — 成功

请求：
```json
{
  "keywords": ["AI", "安全", "股票"],
  "topN": 10
}
```

响应：
```json
{
  "keywords": ["AI", "安全", "股票"],
  "matchMode": "any",
  "sources": { "weibo": true, "zhihu": true, "bilibili": true },
  "topN": 10,
  "refreshMode": "both",
  "scheduledTime": "08:00",
  "cacheTTL": 300
}
```

#### POST /api/config — 校验失败

请求：
```json
{
  "topN": 50
}
```

响应：
```json
{
  "error": true,
  "code": "CONFIG_INVALID",
  "message": "topN 必须为 10、20 或 30"
}
```

#### POST /api/config — 生产环境禁止

```json
{
  "error": true,
  "code": "CONFIG_WRITE_DISABLED",
  "message": "生产环境禁止通过 API 修改配置，请通过环境变量或配置文件管理"
}
```

### 4.6 独立测试

| 测试路径 | 测试方式 |
|---|---|
| GET /api/hot-lists | 启动服务 → curl 请求 → 验证 200 + 响应结构符合 HotListResponse |
| GET /api/hot-lists/:platform | curl /api/hot-lists/weibo → 验证 200 + 单平台结构；curl /api/hot-lists/xxx → 验证 404 |
| POST /api/refresh | curl -X POST /api/refresh → 验证 200 + cache.hit=false |
| GET /api/config | curl /api/config → 验证返回 AppConfig 结构 |
| POST /api/config | curl -X POST -H 'Content-Type: application/json' -d '{...}' /api/config → 验证配置更新 + 校验逻辑 |
| 部分失败场景 | Mock 一个适配器抛出异常 → 验证对应平台 error=true，其他平台正常 |

---

## 5. M8 — server/adapters 适配器层

### 5.1 文件

```
server/src/adapters/IAdapter.ts
server/src/adapters/weibo.adapter.ts
server/src/adapters/zhihu.adapter.ts
server/src/adapters/bilibili.adapter.ts
server/src/adapters/adapterFactory.ts
```

### 5.2 适配器接口

```ts
// server/src/adapters/IAdapter.ts
import { HotList, Platform } from '@shared/types';

interface IAdapter {
  readonly platform: Platform;
  readonly platformName: string;
  readonly sourceName: string;
  /** 获取热榜数据，失败时抛出 AppError(502, 'UPSTREAM_ERROR', ...) */
  fetchHotList(): Promise<HotList>;
}

export { IAdapter };
```

### 5.3 适配器工厂

```ts
// server/src/adapters/adapterFactory.ts
import { Platform } from '@shared/types';
import { IAdapter } from './IAdapter';
import { WeiboAdapter } from './weibo.adapter';
import { ZhihuAdapter } from './zhihu.adapter';
import { BilibiliAdapter } from './bilibili.adapter';

const adapterRegistry: Map<Platform, IAdapter> = new Map();

function registerAdapter(adapter: IAdapter): void {
  adapterRegistry.set(adapter.platform, adapter);
}

function getAdapter(platform: Platform): IAdapter {
  const adapter = adapterRegistry.get(platform);
  if (!adapter) {
    throw new Error(`适配器未注册: ${platform}`);
  }
  return adapter;
}

function getAllAdapters(): IAdapter[] {
  return Array.from(adapterRegistry.values());
}

// 启动时注册所有适配器
export function initAdapters(): void {
  registerAdapter(new WeiboAdapter());
  registerAdapter(new ZhihuAdapter());
  registerAdapter(new BilibiliAdapter());
}

export { getAdapter, getAllAdapters, registerAdapter };
```

### 5.4 WeiboAdapter 详细设计

```ts
// server/src/adapters/weibo.adapter.ts
import { HotList } from '@shared/types';
import { IAdapter } from './IAdapter';
import { AppError } from '../middleware/errorHandler';

/** 微博 API 原始响应中单条记录的结构（TBD：实际接口确定后修正） */
interface WeiboRawItem {
  rank: number;
  word: string;
  url: string;
  num?: number;
  tag?: string;
  raw_created_at?: string;
}

/** 微博 API 原始响应结构（TBD） */
interface WeiboRawResponse {
  data: WeiboRawItem[];
}

class WeiboAdapter implements IAdapter {
  readonly platform = 'weibo' as const;
  readonly platformName = '微博';
  readonly sourceName = 'weibo-hot-search';

  /** API 地址，TBD：实际接口确定后从环境变量或配置读取 */
  private get apiUrl(): string {
    return process.env.WEIBO_API_URL || 'TBD';
  }

  async fetchHotList(): Promise<HotList> {
    const url = this.apiUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw: WeiboRawResponse = await response.json();
      const now = new Date().toISOString();

      const items = (raw.data || []).slice(0, 20).map((item) => ({
        rank: item.rank,
        title: item.word,
        url: item.url || `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`,
        heat: item.num != null ? String(item.num) : null,
        tag: item.tag || null,
        createdAt: item.raw_created_at || now,
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
      const message = err instanceof Error ? err.message : '未知错误';
      throw new AppError(
        502,
        'UPSTREAM_ERROR',
        `微博热榜获取失败: ${message}`,
        `URL: ${url}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export { WeiboAdapter };
```

### 5.5 ZhihuAdapter 详细设计

```ts
// server/src/adapters/zhihu.adapter.ts
import { HotList } from '@shared/types';
import { IAdapter } from './IAdapter';
import { AppError } from '../middleware/errorHandler';

/** 知乎 API 原始响应中单条记录的结构（TBD） */
interface ZhihuRawItem {
  rank?: number;
  target?: {
    title?: string;
    url?: string;
    excerpt?: string;
  };
  detail_text?: string;   // 热度文字
  created_at?: number;    // Unix 时间戳
}

/** 知乎 API 原始响应结构（TBD） */
interface ZhihuRawResponse {
  data: ZhihuRawItem[];
}

class ZhihuAdapter implements IAdapter {
  readonly platform = 'zhihu' as const;
  readonly platformName = '知乎';
  readonly sourceName = 'zhihu-hot';

  private get apiUrl(): string {
    return process.env.ZHIHU_API_URL || 'TBD';
  }

  async fetchHotList(): Promise<HotList> {
    const url = this.apiUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw: ZhihuRawResponse = await response.json();
      const now = new Date().toISOString();

      const items = (raw.data || []).slice(0, 20).map((item, index) => ({
        rank: item.rank ?? index + 1,
        title: item.target?.title ?? '(无标题)',
        url: item.target?.url ?? `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(item.target?.title || '')}`,
        heat: item.detail_text ?? null,
        summary: item.target?.excerpt ?? undefined,
        createdAt: item.created_at
          ? new Date(item.created_at * 1000).toISOString()
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
      const message = err instanceof Error ? err.message : '未知错误';
      throw new AppError(
        502,
        'UPSTREAM_ERROR',
        `知乎热榜获取失败: ${message}`,
        `URL: ${url}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export { ZhihuAdapter };
```

### 5.6 BilibiliAdapter 详细设计

```ts
// server/src/adapters/bilibili.adapter.ts
import { HotList } from '@shared/types';
import { IAdapter } from './IAdapter';
import { AppError } from '../middleware/errorHandler';

/** B站 API 原始响应中单条记录的结构（TBD） */
interface BilibiliRawItem {
  rank?: number;
  title?: string;
  bvid?: string;
  play?: number;          // 播放量
  pubdate?: number;       // 发布时间（Unix 时间戳）
}

/** B站 API 原始响应结构（TBD） */
interface BilibiliRawResponse {
  data: {
    list?: BilibiliRawItem[];
  };
}

class BilibiliAdapter implements IAdapter {
  readonly platform = 'bilibili' as const;
  readonly platformName = 'B站';
  readonly sourceName = 'bilibili-hot';

  private get apiUrl(): string {
    return process.env.BILIBILI_API_URL || 'TBD';
  }

  async fetchHotList(): Promise<HotList> {
    const url = this.apiUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw: BilibiliRawResponse = await response.json();
      const now = new Date().toISOString();

      const items = (raw.data?.list || []).slice(0, 20).map((item, index) => ({
        rank: item.rank ?? index + 1,
        title: item.title ?? '(无标题)',
        url: item.bvid
          ? `https://www.bilibili.com/video/${item.bvid}`
          : `https://search.bilibili.com/all?keyword=${encodeURIComponent(item.title || '')}`,
        heat: item.play != null ? `${(item.play / 10000).toFixed(1)} 万播放` : null,
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
      const message = err instanceof Error ? err.message : '未知错误';
      throw new AppError(
        502,
        'UPSTREAM_ERROR',
        `B站热榜获取失败: ${message}`,
        `URL: ${url}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export { BilibiliAdapter };
```

### 5.7 边界条件

| 边界条件 | 处理方式 |
|---|---|
| 上游返回空列表 | items = []，正常返回，前端显示「暂无数据」 |
| 上游返回超过 20 条 | 只取前 20 条 |
| 上游字段缺失 | 使用后备值（如 title 缺失 → "(无标题)"，rank 缺失 → index+1） |
| 超时 5 秒未响应 | AbortController 中断请求，抛出 UPSTREAM_ERROR |
| JSON 解析失败 | fetch 后 response.json() 自动抛出，进入 catch 分支 |
| 上游返回非 2xx | 抛出 UPSTREAM_ERROR，含 HTTP 状态码 |
| 适配器未注册 | adapterFactory.getAdapter() 抛出错误 |

### 5.8 独立测试

| 测试对象 | 测试方式 |
|---|---|
| WeiboAdapter | Mock fetch → 验证字段映射正确（rank→rank, word→title 等） |
| ZhihuAdapter | Mock fetch → 验证字段映射 + 后备值逻辑 |
| BilibiliAdapter | Mock fetch → 验证播放量格式化为 "X 万播放" |
| 超时场景 | Mock fetch 延迟 6s → 验证抛出 UPSTREAM_ERROR |
| 空数据 | Mock fetch 返回空数组 → 验证返回 items: [] |
| adapterFactory | 注册 mock 适配器 → getAdapter() → 验证返回正确实例 |

---

## 6. M9 — server/services 业务服务层

### 6.1 文件

```
server/src/services/cacheService.ts
server/src/services/configService.ts
server/src/services/schedulerService.ts
```

### 6.2 CacheService

```ts
// server/src/services/cacheService.ts
import { HotList, Platform } from '@shared/types';
import { getAdapter } from '../adapters/adapterFactory';
import { configService } from './configService';

interface CacheEntry {
  data: HotList;
  timestamp: number;   // Date.now()
}

class CacheService {
  private store = new Map<Platform, CacheEntry>();

  /** 判断缓存是否有效 */
  private isValid(platform: Platform): boolean {
    const entry = this.store.get(platform);
    if (!entry) return false;

    const ttl = configService.get().cacheTTL * 1000;
    return Date.now() - entry.timestamp < ttl;
  }

  /** 获取单平台缓存（不检查 TTL） */
  get(platform: Platform): HotList | null {
    return this.store.get(platform)?.data ?? null;
  }

  /** 写入单平台缓存 */
  set(platform: Platform, data: HotList): void {
    this.store.set(platform, { data, timestamp: Date.now() });
  }

  /** 获取或拉取单平台数据（检查 TTL） */
  async getOrFetch(platform: Platform): Promise<HotList> {
    if (this.isValid(platform)) {
      const cached = this.get(platform)!;
      return cached;
    }

    try {
      const adapter = getAdapter(platform);
      const data = await adapter.fetchHotList();
      this.set(platform, data);
      return data;
    } catch {
      // 拉取失败 → 尝试回退缓存（即使过期）
      const stale = this.get(platform);
      if (stale) {
        return { ...stale, error: true, message: '上游接口请求失败，当前显示的是缓存数据' };
      }
      // 无任何缓存 → 返回错误占位
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

  /** 批量获取或拉取（并行） */
  async getOrFetchAll(platforms: Platform[]): Promise<HotList[]> {
    return Promise.all(platforms.map((p) => this.getOrFetch(p)));
  }

  /** 强制刷新全部平台（绕过 TTL） */
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

      // 失败回退旧缓存
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

/** 平台标识 → 展示名称映射 */
function adapterName(p: Platform): string {
  const map: Record<Platform, string> = { weibo: '微博', zhihu: '知乎', bilibili: 'B站' };
  return map[p];
}

export const cacheService = new CacheService();
```

### 6.3 ConfigService

```ts
// server/src/services/configService.ts
import fs from 'node:fs';
import path from 'node:path';
import { AppConfig, AppConfigPartial } from '@shared/types';

const CONFIG_PATH = path.resolve(__dirname, '../../config.json');

const DEFAULT_CONFIG: AppConfig = {
  keywords: [],
  matchMode: 'any',
  sources: { weibo: true, zhihu: true, bilibili: true },
  topN: 20,
  refreshMode: 'both',
  scheduledTime: '08:00',
  cacheTTL: 300,
};

class ConfigService {
  private memoryCache: AppConfig | null = null;

  /** 从文件加载配置，失败时返回默认配置 */
  private loadFromFile(): AppConfig {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        this.writeToFile(DEFAULT_CONFIG);
        return { ...DEFAULT_CONFIG };
      }
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      console.warn('[ConfigService] 配置文件读取失败，使用默认配置');
      return { ...DEFAULT_CONFIG };
    }
  }

  /** 写入配置文件 */
  private writeToFile(config: AppConfig): void {
    try {
      const dir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ConfigService] 配置文件写入失败:', err);
      throw err;
    }
  }

  /** 获取当前配置 */
  get(): AppConfig {
    if (!this.memoryCache) {
      this.memoryCache = this.loadFromFile();
    }
    return { ...this.memoryCache };
  }

  /** 更新配置（部分合并 + 写文件 + 更新内存） */
  update(partial: AppConfigPartial): AppConfig {
    const current = this.get();
    const merged: AppConfig = { ...current, ...partial };
    this.writeToFile(merged);
    this.memoryCache = merged;
    return { ...merged };
  }

  /** 重置为默认配置 */
  reset(): AppConfig {
    this.writeToFile(DEFAULT_CONFIG);
    this.memoryCache = { ...DEFAULT_CONFIG };
    return this.get();
  }
}

export const configService = new ConfigService();
```

### 6.4 SchedulerService

```ts
// server/src/services/schedulerService.ts
import cron from 'node-cron';
import { configService } from './configService';
import { cacheService } from './cacheService';
import { Platform } from '@shared/types';

class SchedulerService {
  private task: cron.ScheduledTask | null = null;

  /** 启动定时任务 */
  start(): void {
    const config = configService.get();

    if (config.refreshMode === 'manual') {
      console.log('[Scheduler] refreshMode=manual，跳过定时任务注册');
      return;
    }

    const [hour, minute] = config.scheduledTime.split(':').map(Number);
    const expression = `${minute} ${hour} * * *`;

    console.log(`[Scheduler] 注册定时刷新任务: ${expression} (每天 ${config.scheduledTime})`);

    this.task = cron.schedule(expression, async () => {
      console.log(`[Scheduler] 定时刷新触发 @ ${new Date().toISOString()}`);
      try {
        const currentConfig = configService.get();
        const enabled = (Object.keys(currentConfig.sources) as Platform[])
          .filter((k) => currentConfig.sources[k]);
        await cacheService.refreshAll(enabled);
        console.log(`[Scheduler] 定时刷新完成，平台: ${enabled.join(', ')}`);
      } catch (err) {
        console.error('[Scheduler] 定时刷新失败:', err);
      }
    });
  }

  /** 停止定时任务 */
  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[Scheduler] 定时任务已停止');
    }
  }

  /** 重启定时任务（配置变更后调用） */
  restart(): void {
    this.stop();
    this.start();
  }
}

export const schedulerService = new SchedulerService();
```

### 6.5 独立测试

| 测试对象 | 测试方式 |
|---|---|
| CacheService.getOrFetch | 写入一个已过期的缓存 → 验证触发 fetch；写入未过期缓存 → 验证不触发 fetch |
| CacheService 失败回退 | Mock adapter 抛异常 + 有旧缓存 → 验证返回旧缓存 + error=true |
| CacheService 无缓存失败 | Mock adapter 抛异常 + 无缓存 → 验证返回空 items + error=true |
| CacheService.refreshAll | Promise.allSettled 下部分失败 → 验证失败平台有 error 标记，成功平台正常 |
| ConfigService.get | 删除 config.json → 验证自动创建并返回默认配置 |
| ConfigService.update | 部分更新 → 验证合并正确 + 文件写入正确 |
| ConfigService JSON 损坏 | 手动写入非法 JSON → 验证 get() 返回默认配置 |
| SchedulerService | 设置 refreshMode=manual → 验证 task 为 null；设置 scheduled → 验证注册 cron |

---

## 7. M2 — client/api API 请求层

### 7.1 文件

```
client/src/api/client.ts
```

### 7.2 实现

```ts
// client/src/api/client.ts
import { HotListResponse, HotList, AppConfig, AppConfigPartial } from '@shared/types';

/** API 基础路径：开发环境走 Vite proxy，生产环境走环境变量 */
const BASE_URL = import.meta.env.VITE_API_BASE || '';

/** 通用 fetch 封装 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

/** 自定义错误类型 */
class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error: true; code: string; message: string; details?: string },
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
}

/** 获取聚合热榜 */
async function fetchHotLists(): Promise<HotListResponse> {
  return request<HotListResponse>('/api/hot-lists');
}

/** 获取单平台热榜 */
async function fetchHotList(platform: string): Promise<HotList> {
  return request<HotList>(`/api/hot-lists/${platform}`);
}

/** 强制刷新 */
async function triggerRefresh(): Promise<HotListResponse> {
  return request<HotListResponse>('/api/refresh', { method: 'POST' });
}

/** 获取配置 */
async function fetchConfig(): Promise<AppConfig> {
  return request<AppConfig>('/api/config');
}

/** 更新配置 */
async function updateConfig(data: AppConfigPartial): Promise<AppConfig> {
  return request<AppConfig>('/api/config', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export { fetchHotLists, fetchHotList, triggerRefresh, fetchConfig, updateConfig, ApiError };
export type { HotListResponse, HotList, AppConfig, AppConfigPartial };
```

### 7.3 独立测试

| 测试方式 |
|---|
| Mock fetch 全局函数 → 验证各 API 函数请求路径和方法正确 |
| Mock 错误响应 → 验证 ApiError 抛出，status 和 body 正确传递 |

---

## 8. M6 — client/context 全局状态

### 8.1 文件

```
client/src/context/ConfigContext.tsx
```

### 8.2 实现

```tsx
// client/src/context/ConfigContext.tsx
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppConfig, AppConfigPartial } from '@shared/types';
import { fetchConfig, updateConfig as apiUpdateConfig } from '../api/client';

/** 默认配置（接口返回前使用） */
const DEFAULT_CONFIG: AppConfig = {
  keywords: [],
  matchMode: 'any',
  sources: { weibo: true, zhihu: true, bilibili: true },
  topN: 20,
  refreshMode: 'both',
  scheduledTime: '08:00',
  cacheTTL: 300,
};

// ---- Context ----

interface ConfigContextValue {
  config: AppConfig;
  loading: boolean;
  error: string | null;
  updateConfig: (partial: AppConfigPartial) => Promise<void>;
  reload: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

// ---- Reducer ----

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: AppConfig }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'UPDATE_SUCCESS'; payload: AppConfig }
  | { type: 'UPDATE_ERROR'; payload: string };

interface State {
  config: AppConfig;
  loading: boolean;
  error: string | null;
}

function configReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
    case 'UPDATE_SUCCESS':
      return { config: action.payload, loading: false, error: null };
    case 'LOAD_ERROR':
    case 'UPDATE_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

// ---- Provider ----

function ConfigProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(configReducer, {
    config: DEFAULT_CONFIG,
    loading: true,
    error: null,
  });

  const load = async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const config = await fetchConfig();
      dispatch({ type: 'LOAD_SUCCESS', payload: config });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '配置加载失败';
      dispatch({ type: 'LOAD_ERROR', payload: msg });
    }
  };

  const update = async (partial: AppConfigPartial) => {
    try {
      const config = await apiUpdateConfig(partial);
      dispatch({ type: 'UPDATE_SUCCESS', payload: config });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '配置保存失败';
      dispatch({ type: 'UPDATE_ERROR', payload: msg });
      throw err;  // 让调用方也能感知失败
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <ConfigContext.Provider
      value={{ config: state.config, loading: state.loading, error: state.error, updateConfig: update, reload: load }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

function useConfigContext(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfigContext 必须在 ConfigProvider 内部使用');
  return ctx;
}

export { ConfigProvider, useConfigContext };
```

### 8.3 独立测试

| 测试方式 |
|---|
| 用 Mock API 替换 fetchConfig → mount Provider → 验证子组件能读取 config |
| 模拟 API 失败 → 验证 error 状态更新 |
| 调用 updateConfig → 验证 config 更新 + API 调用 |

---

## 9. M5 — client/hooks 状态逻辑层

### 9.1 文件

```
client/src/hooks/useHotLists.ts
client/src/hooks/useRefresh.ts
client/src/hooks/useKeywordMatch.ts
```

### 9.2 useHotLists

```ts
// client/src/hooks/useHotLists.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchHotLists } from '../api/client';
import type { HotListResponse } from '@shared/types';

interface UseHotListsResult {
  data: HotListResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useHotLists(): UseHotListsResult {
  const [data, setData] = useState<HotListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHotLists();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

export { useHotLists };
export type { UseHotListsResult };
```

### 9.3 useRefresh

```ts
// client/src/hooks/useRefresh.ts
import { useState, useCallback } from 'react';
import { triggerRefresh } from '../api/client';
import type { HotListResponse } from '@shared/types';

interface UseRefreshResult {
  refreshing: boolean;
  lastResult: HotListResponse | null;
  error: string | null;
  refresh: () => Promise<void>;
}

function useRefresh(onSuccess?: (data: HotListResponse) => void): UseRefreshResult {
  const [refreshing, setRefreshing] = useState(false);
  const [lastResult, setLastResult] = useState<HotListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await triggerRefresh();
      setLastResult(result);
      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新失败');
    } finally {
      setRefreshing(false);
    }
  }, [onSuccess]);

  return { refreshing, lastResult, error, refresh };
}

export { useRefresh };
export type { UseRefreshResult };
```

### 9.4 useKeywordMatch

```ts
// client/src/hooks/useKeywordMatch.ts
import { useMemo } from 'react';
import type { HotItem, AppConfig } from '@shared/types';
import type { HotItemMatched } from '@shared/types';

/**
 * 根据配置对热榜条目执行关键字匹配和高亮
 *
 * 返回: HotItemMatched[]
 *  - matched=true  表示命中关键字
 *  - highlightedTitle 包含 <mark> 标签的 HTML 片段
 *  - exclude 模式下命中关键字的条目会被过滤
 */
function useKeywordMatch(items: HotItem[], config: AppConfig): HotItemMatched[] {
  return useMemo(() => {
    const { keywords, matchMode } = config;

    if (!keywords.length) {
      return items.map((item) => ({ ...item, matched: false }));
    }

    const lowerKeywords = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);

    const matchedItems = items.map((item) => {
      const titleLower = item.title.toLowerCase();
      const hits = lowerKeywords.filter((kw) => titleLower.includes(kw));

      const isMatch = matchMode === 'all'
        ? hits.length === lowerKeywords.length
        : hits.length > 0;

      if (matchMode === 'exclude' && hits.length > 0) {
        return null as unknown as HotItemMatched;  // 标记为过滤
      }

      let highlightedTitle = item.title;
      if (isMatch && matchMode !== 'exclude') {
        for (const kw of hits) {
          const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          highlightedTitle = highlightedTitle.replace(
            new RegExp(`(${escaped})`, 'gi'),
            '<mark>$1</mark>',
          );
        }
      }

      return { ...item, matched: isMatch, highlightedTitle };
    });

    // exclude 模式：过滤掉命中关键字的条目
    if (matchMode === 'exclude') {
      return matchedItems.filter(Boolean) as HotItemMatched[];
    }

    return matchedItems as HotItemMatched[];
  }, [items, config]);
}

export { useKeywordMatch };
```

### 9.5 独立测试

| 测试对象 | 测试方式 |
|---|---|
| useHotLists | Mock fetchHotLists 返回值 → 验证 data/loading/error 状态转换 |
| useRefresh | Mock triggerRefresh → 验证 refreshing 状态 + onSuccess 回调 |
| useKeywordMatch (any) | keywords=["AI"] + items 含 AI 标题 → 验证 matched=true + mark 标签 |
| useKeywordMatch (all) | keywords=["AI","安全"] → 只含一个的不匹配 |
| useKeywordMatch (exclude) | keywords=["广告"] → 验证命中条目被过滤 |
| useKeywordMatch (空关键字) | keywords=[] → 验证不做任何标记 |

---

## 10. M3 — client/components 组件层

### 10.1 文件

```
client/src/components/Layout.tsx
client/src/components/Layout.module.css
client/src/components/HotCard.tsx
client/src/components/HotCard.module.css
client/src/components/HotItemRow.tsx
client/src/components/HotItemRow.module.css
client/src/components/RefreshButton.tsx
client/src/components/LoadingState.tsx
client/src/components/ErrorState.tsx
client/src/components/ConfigForm.tsx
client/src/components/KeywordManager.tsx
```

### 10.2 Layout

```tsx
// client/src/components/Layout.tsx
import { Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>今日热搜</h1>
        <p className="app-subtitle">聚合微博、知乎、B站今日热榜</p>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>本网站仅用于学习研究，非商业用途</p>
        <p>数据来源：微博、知乎、B站公开热榜接口</p>
      </footer>
    </div>
  );
}

export { Layout };
```

### 10.3 HotCard

```tsx
// client/src/components/HotCard.tsx
import { HotItemRow } from './HotItemRow';
import { ErrorState } from './ErrorState';
import type { HotList } from '@shared/types';
import type { HotItemMatched } from '@shared/types';

interface HotCardProps {
  list: HotList;
  items: HotItemMatched[];
}

function HotCard({ list, items }: HotCardProps) {
  const { platformName, updatedAt, error, message } = list;

  const formattedTime = new Date(updatedAt).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const matchedCount = items.filter((i) => i.matched).length;

  return (
    <section className={`hot-card${error ? ' hot-card--error' : ''}`}>
      <div className="hot-card__header">
        <h2>{platformName}</h2>
        <span className="hot-card__time">更新于 {formattedTime}</span>
        {matchedCount > 0 && (
          <span className="hot-card__match-badge">命中关注关键词 {matchedCount} 条</span>
        )}
      </div>

      {error && <ErrorState message={message || '数据获取异常'} inline />}

      {items.length === 0 && !error ? (
        <p className="hot-card__empty">暂无数据</p>
      ) : (
        <ol className="hot-card__list">
          {items.map((item) => (
            <HotItemRow key={`${list.platform}-${item.rank}`} item={item} />
          ))}
        </ol>
      )}
    </section>
  );
}

export { HotCard };
export type { HotCardProps };
```

### 10.4 HotItemRow

```tsx
// client/src/components/HotItemRow.tsx
import type { HotItemMatched } from '@shared/types';

interface HotItemRowProps {
  item: HotItemMatched;
}

function HotItemRow({ item }: HotItemRowProps) {
  const { rank, title, url, heat, summary, tag, matched, highlightedTitle } = item;

  return (
    <li className={`hot-item${matched ? ' hot-item--matched' : ''}`}>
      <span className="hot-item__rank">{rank}</span>
      <div className="hot-item__content">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hot-item__title"
          dangerouslySetInnerHTML={highlightedTitle ? { __html: highlightedTitle } : undefined}
        >
          {highlightedTitle ? undefined : title}
        </a>
        {summary && <p className="hot-item__summary">{summary}</p>}
        <div className="hot-item__meta">
          {heat && <span className="hot-item__heat">{heat}</span>}
          {tag && <span className="hot-item__tag">{tag}</span>}
          {matched && <span className="hot-item__followed">已关注</span>}
        </div>
      </div>
    </li>
  );
}

export { HotItemRow };
export type { HotItemRowProps };
```

**注意**：`dangerouslySetInnerHTML` 用于高亮关键字。highlightedTitle 由 `useKeywordMatch` 生成，关键字已通过 `escape` 转义正则特殊字符，`<mark>` 标签是唯一注入的 HTML，无 XSS 风险。

### 10.5 RefreshButton

```tsx
// client/src/components/RefreshButton.tsx

interface RefreshButtonProps {
  onClick: () => void;
  loading: boolean;
}

function RefreshButton({ onClick, loading }: RefreshButtonProps) {
  return (
    <button
      className="refresh-btn"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? '刷新中...' : '刷新'}
    </button>
  );
}

export { RefreshButton };
```

### 10.6 LoadingState / ErrorState

```tsx
// client/src/components/LoadingState.tsx
function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-state__spinner" />
      <p>正在加载热榜数据...</p>
    </div>
  );
}

// client/src/components/ErrorState.tsx
interface ErrorStateProps {
  message: string;
  inline?: boolean;   // true = 卡片内嵌提示，false = 整页错误
}

function ErrorState({ message, inline }: ErrorStateProps) {
  if (inline) {
    return <div className="error-state error-state--inline">⚠ {message}</div>;
  }
  return (
    <div className="error-state">
      <p className="error-state__icon">😞</p>
      <p>{message}</p>
    </div>
  );
}

export { LoadingState, ErrorState };
```

### 10.7 ConfigForm

```tsx
// client/src/components/ConfigForm.tsx
import { useState } from 'react';
import { useConfigContext } from '../context/ConfigContext';
import { KeywordManager } from './KeywordManager';
import type { AppConfig } from '@shared/types';

function ConfigForm() {
  const { config, updateConfig, loading } = useConfigContext();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 本地表单状态（由各子组件回调更新 + 最终 submit 时提交）

  const handleSave = async (partial: Partial<AppConfig>) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateConfig(partial);
      setMessage('配置已保存');
    } catch {
      setMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 各配置区域 onChange 直接调 updateConfig（即时生效）
  return (
    <form className="config-form" onSubmit={(e) => e.preventDefault()}>
      <h2>配置</h2>

      <KeywordManager
        keywords={config.keywords}
        onChange={(keywords) => handleSave({ keywords })}
      />

      <fieldset>
        <legend>匹配模式</legend>
        <select
          value={config.matchMode}
          onChange={(e) => handleSave({ matchMode: e.target.value as AppConfig['matchMode'] })}
        >
          <option value="any">任一命中</option>
          <option value="all">全部命中</option>
          <option value="exclude">排除关键字</option>
        </select>
      </fieldset>

      <fieldset>
        <legend>数据源</legend>
        {(['weibo', 'zhihu', 'bilibili'] as const).map((src) => (
          <label key={src}>
            <input
              type="checkbox"
              checked={config.sources[src]}
              onChange={(e) =>
                handleSave({ sources: { ...config.sources, [src]: e.target.checked } })
              }
            />
            {{ weibo: '微博', zhihu: '知乎', bilibili: 'B站' }[src]}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>展示数量</legend>
        <select
          value={config.topN}
          onChange={(e) => handleSave({ topN: Number(e.target.value) as 10 | 20 | 30 })}
        >
          <option value={10}>10 条/平台</option>
          <option value={20}>20 条/平台</option>
          <option value={30}>30 条/平台</option>
        </select>
      </fieldset>

      <fieldset>
        <legend>刷新策略</legend>
        <select
          value={config.refreshMode}
          onChange={(e) => handleSave({ refreshMode: e.target.value as AppConfig['refreshMode'] })}
        >
          <option value="manual">仅手动刷新</option>
          <option value="scheduled">仅定时刷新</option>
          <option value="both">手动 + 定时</option>
        </select>
      </fieldset>

      {message && <p className="config-form__message">{message}</p>}
      {loading && <p>加载配置中...</p>}
    </form>
  );
}

export { ConfigForm };
```

### 10.8 KeywordManager

```tsx
// client/src/components/KeywordManager.tsx
import { useState } from 'react';

interface KeywordManagerProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

function KeywordManager({ keywords, onChange }: KeywordManagerProps) {
  const [input, setInput] = useState('');

  const addKeyword = () => {
    const trimmed = input.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
      setInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    onChange(keywords.filter((k) => k !== kw));
  };

  return (
    <fieldset>
      <legend>关注关键字</legend>
      <div className="keyword-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
          placeholder="输入关键字后按回车添加"
        />
        <button type="button" onClick={addKeyword}>添加</button>
      </div>
      <div className="keyword-tags">
        {keywords.map((kw) => (
          <span key={kw} className="keyword-tag">
            {kw}
            <button type="button" onClick={() => removeKeyword(kw)}>×</button>
          </span>
        ))}
      </div>
      {keywords.length === 0 && <p className="hint">未设置关键字，首页不做标记</p>}
    </fieldset>
  );
}

export { KeywordManager };
```

### 10.9 独立测试

| 测试对象 | 测试方式 |
|---|---|
| HotCard | 传入 mock HotList + items → 验证渲染正确（排名、标题链接、热度显示） |
| HotCard error 态 | error=true → 验证 ErrorState 出现 |
| HotItemRow | matched=true → 验证「已关注」标签和 <mark> 高亮 |
| HotItemRow 无热度 | heat=null → 验证不渲染热度元素 |
| RefreshButton | loading=true → 验证按钮 disabled + 文字变化 |
| ConfigForm | 修改各配置项 → 验证 updateConfig 被调用 |
| KeywordManager | 输入并添加关键字 → 验证 onChange 触发 + 输入框清空 |

---

## 11. M4 — client/pages 页面层

### 11.1 文件

```
client/src/pages/HomePage.tsx
client/src/pages/ConfigPage.tsx
```

### 11.2 HomePage

```tsx
// client/src/pages/HomePage.tsx
import { useHotLists } from '../hooks/useHotLists';
import { useRefresh } from '../hooks/useRefresh';
import { useKeywordMatch } from '../hooks/useKeywordMatch';
import { useConfigContext } from '../context/ConfigContext';
import { HotCard } from '../components/HotCard';
import { RefreshButton } from '../components/RefreshButton';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

function HomePage() {
  const { data, loading, error, refetch } = useHotLists();
  const { config } = useConfigContext();
  const { refreshing, refresh } = useRefresh(() => { refetch(); });

  // 对每个平台的热榜条目应用关键字匹配
  const matchedData = data
    ? data.data.map((list) => ({
        list,
        items: useKeywordMatchHook(list.items, config),
      }))
    : [];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="无法获取数据" />;

  return (
    <div className="home-page">
      <div className="home-page__toolbar">
        <span>最后更新：{new Date(data.updatedAt).toLocaleString('zh-CN')}</span>
        <RefreshButton onClick={refresh} loading={refreshing} />
      </div>

      <div className="home-page__grid">
        {matchedData.map(({ list, items }) => (
          <HotCard key={list.platform} list={list} items={items} />
        ))}
      </div>
    </div>
  );
}

// useKeywordMatch 在 map 回调里调用的辅助
function useKeywordMatchHook(items: HotItem[], config: AppConfig) {
  return useKeywordMatch(items, config);
}

export { HomePage };
```

**设计修正**：`useKeywordMatch` 是 hook，不能在 `Array.map` 回调中直接调用。修正为在 HomePage 中一次性对全部平台数据执行匹配：

```tsx
function HomePage() {
  const { data, loading, error, refetch } = useHotLists();
  const { config } = useConfigContext();
  const { refreshing, refresh } = useRefresh(() => { refetch(); });

  // 一次性对所有平台数据执行关键字匹配
  const allMatchedItems = useMemo(() => {
    if (!data) return [];
    return data.data.map((list) => ({
      list,
      matchedItems: matchKeywords(list.items, config),
    }));
  }, [data, config]);

  // ...同上的渲染逻辑，使用 allMatchedItems
}

/** 纯函数版关键字匹配（便于在 useMemo 中使用） */
function matchKeywords(items: HotItem[], config: AppConfig): HotItemMatched[] {
  const { keywords, matchMode } = config;
  if (!keywords.length) return items.map((item) => ({ ...item, matched: false }));

  const lowerKeywords = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);

  const matchedItems = items.map((item) => {
    const titleLower = item.title.toLowerCase();
    const hits = lowerKeywords.filter((kw) => titleLower.includes(kw));
    const isMatch = matchMode === 'all' ? hits.length === lowerKeywords.length : hits.length > 0;

    if (matchMode === 'exclude' && hits.length > 0) return null;

    let highlightedTitle: string | undefined;
    if (isMatch && matchMode !== 'exclude') {
      highlightedTitle = item.title;
      for (const kw of hits) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        highlightedTitle = highlightedTitle.replace(
          new RegExp(`(${escaped})`, 'gi'),
          '<mark>$1</mark>',
        );
      }
    }

    return { ...item, matched: isMatch, highlightedTitle } as HotItemMatched;
  });

  if (matchMode === 'exclude') return matchedItems.filter(Boolean) as HotItemMatched[];
  return matchedItems as HotItemMatched[];
}
```

### 11.3 ConfigPage

```tsx
// client/src/pages/ConfigPage.tsx
import { Link } from 'react-router-dom';
import { useConfigContext } from '../context/ConfigContext';
import { ConfigForm } from '../components/ConfigForm';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

function ConfigPage() {
  const { loading, error } = useConfigContext();

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="config-page">
      <Link to="/" className="back-link">← 返回首页</Link>
      <ConfigForm />
    </div>
  );
}

export { ConfigPage };
```

### 11.4 独立测试

| 测试对象 | 测试方式 |
|---|---|
| HomePage 加载态 | Mock useHotLists 返回 loading=true → 验证 LoadingState 显示 |
| HomePage 正常态 | Mock 完整 HotListResponse → 验证 3 个 HotCard 渲染 |
| HomePage 刷新 | 点击 RefreshButton → 验证 refreshing 状态 + 数据更新 |
| HomePage 关键字匹配 | 设置 config.keywords=["AI"] → 验证 HotItemRow 显示 matched 样式 |
| ConfigPage | 进入 /config → 验证 ConfigForm 显示 + 可修改配置 |

---

## 12. App 入口与路由

### 12.1 文件

```
client/src/App.tsx
client/src/main.tsx
client/src/index.css              # 全局样式
```

### 12.2 App.tsx

```tsx
// client/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from './context/ConfigContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ConfigPage } from './pages/ConfigPage';

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Route>
        </Routes>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export { App };
```

### 12.3 main.tsx

```tsx
// client/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

---

## 13. server 入口

### 13.1 文件

```
server/src/app.ts
server/src/index.ts
server/src/config.ts
```

### 13.2 config.ts

```ts
// server/src/config.ts
import dotenv from 'dotenv';
dotenv.config();

const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '',
  // 各平台 API URL（TBD：接入真实接口后从环境变量读取）
  WEIBO_API_URL: process.env.WEIBO_API_URL || '',
  ZHIHU_API_URL: process.env.ZHIHU_API_URL || '',
  BILIBILI_API_URL: process.env.BILIBILI_API_URL || '',
};

export { env };
```

### 13.3 app.ts

```ts
// server/src/app.ts
import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes/index';
import { initAdapters } from './adapters/adapterFactory';

// 注册所有适配器
initAdapters();

const app = express();

// 中间件
app.use(corsMiddleware);
app.use(express.json());

// API 路由
app.use('/api', apiRouter);

// 全局错误处理（必须放在路由之后）
app.use(errorHandler);

export { app };
```

### 13.4 index.ts

```ts
// server/src/index.ts
import { app } from './app';
import { env } from './config';
import { schedulerService } from './services/schedulerService';

app.listen(env.PORT, () => {
  console.log(`[Server] 今日热搜后端已启动: http://localhost:${env.PORT}`);
  console.log(`[Server] 环境: ${env.NODE_ENV}`);
  schedulerService.start();
});
```

---

## 14. 模块间依赖汇总

```
          M4 (pages)
         /    |    \
       M3    M5     M6
    (components)(hooks)(context)
         \    |    /
           M2 (api)
            |
       =====|===== HTTP =====|=====
            |
           M7 (routes)
         /    |    \
       M10   M9    M8
   (middleware)(services)(adapters)
            |
          M1 (shared)
```

各模块可通过 Mock 下层依赖实现独立测试：
- **M2**：Mock fetch 全局函数
- **M3**：传入 mock props
- **M4**：Mock hooks 返回值
- **M5**：Mock M2 API 返回值
- **M6**：Mock M2 API 返回值
- **M7**：Mock M9 service
- **M8**：Mock fetch 平台 API
- **M9**：Mock M8 adapter
- **M10**：无依赖，可直接测试

---

## 15. TBD 清单

| 项目 | 说明 | 影响模块 |
|---|---|---|
| 微博热榜 JSON API 地址及响应字段 | 需在实际开发时通过环境变量填入 | M8 WeiboAdapter |
| 知乎热榜 JSON API 地址及响应字段 | 同上 | M8 ZhihuAdapter |
| B 站热榜 JSON API 地址及响应字段 | 同上 | M8 BilibiliAdapter |
| Vercel 部署域名 | 部署后填入 CLIENT_ORIGIN 环境变量 | M10 cors |
| Railway 部署域名 | 部署后填入 VITE_API_BASE | M2 api |
