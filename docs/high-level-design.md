# 今日热搜 · 概要设计文档

## 1. 设计目标

基于 proposal.md 需求规格，将系统拆分为可独立开发的模块，明确各模块职责、接口和模块间交互关系。

### 1.1 技术栈确认

| 层级 | 技术 | 说明 |
|---|---|---|
| 前端 | React + TypeScript + Vite | SPA，react-router-dom 管理路由 |
| 样式 | CSS Modules | 组件级样式隔离 |
| 后端 | Node.js + Express + TypeScript | tsx 运行时 |
| 数据源 | 各平台非官方 JSON 接口 | 后端直接 fetch 各平台热榜接口 |
| 缓存 | 内存 Map | TTL 默认 300 秒 |
| 配置存储 | 后端 JSON 文件 | 路径 server/config.json |
| 定时任务 | node-cron | 每日 08:00 自动刷新 |
| 部署 | 前端 Vercel / 后端 Railway | HTTPS 公网访问 |

### 1.2 设计原则

- **适配器模式**：每个平台封装独立适配器，统一输出标准 HotList
- **缓存优先**：所有读请求优先走缓存，降低上游调用频率
- **失败隔离**：单个平台失败不影响其他平台数据展示
- **前后端类型共享**：数据模型类型抽取为 shared 包，前后端共用

### 1.3 架构示意图

```
访客浏览器
    │
    ▼
React 前端 (Vercel)
    │
    │  GET /api/hot-lists
    ▼
Express 后端 (Railway)
    │
    ├── 缓存命中 → 直接返回
    │
    └── 缓存未命中
          │
          ├── fetch 微博 JSON ──→ 清洗 → HotList
          ├── fetch 知乎 JSON ──→ 清洗 → HotList
          └── fetch B站 JSON  ──→ 清洗 → HotList
                │
                ▼
          写入内存缓存 (TTL 300s)
                │
                ▼
          返回聚合数据 → React → 渲染卡片
```

---

## 2. 系统模块划分

### 2.1 模块总览

```
mini-hot-hub/
├── shared/                     # 共享类型定义（前后端共用）
│   └── types.ts               # HotItem, HotList, HotListResponse, AppConfig
├── client/                     # 前端 SPA
│   ├── src/
│   │   ├── api/               # API 请求层
│   │   ├── components/        # 可复用 UI 组件
│   │   ├── pages/             # 页面组件
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── context/           # React Context 状态管理
│   │   ├── types/             # 前端专用类型（引用 shared）
│   │   ├── App.tsx
│   │   └── main.tsx
├── server/                     # 后端服务
│   ├── src/
│   │   ├── routes/            # Express 路由定义
│   │   ├── adapters/          # 数据源适配器（每个平台一个）
│   │   ├── services/          # 业务服务（缓存、配置、调度）
│   │   ├── middleware/        # Express 中间件
│   │   ├── config.ts          # 环境变量与默认配置
│   │   ├── app.ts             # Express 应用创建
│   │   └── index.ts           # 入口，启动服务
│   └── config.json            # 运行时配置文件
└── docs/                       # 文档
```

### 2.2 模块职责

#### M1 — shared 共享类型

| 项 | 说明 |
|---|---|
| 职责 | 定义前后端共用的 TypeScript 类型和接口 |
| 内容 | HotItem, HotList, HotListResponse, AppConfig 类型定义 |
| 依赖 | 无 |

#### M2 — client/api API 请求层

| 项 | 说明 |
|---|---|
| 职责 | 封装所有对后端的 HTTP 请求 |
| 内容 | fetchHotLists(), fetchHotList(platform), triggerRefresh(), fetchConfig(), updateConfig() |
| 依赖 | shared 类型 |

#### M3 — client/components 组件层

| 项 | 说明 |
|---|---|
| 职责 | 可复用的 UI 组件 |
| 组件 | Layout（页头/页脚）、HotCard（平台卡片）、HotItemRow（条目行）、RefreshButton（刷新按钮）、ConfigForm（配置表单）、KeywordManager（关键字管理）、LoadingState、ErrorState |
| 依赖 | shared 类型 |

#### M4 — client/pages 页面层

| 项 | 说明 |
|---|---|
| 职责 | 页面级组件，组合 components 和 hooks |
| 页面 | HomePage（首页）、ConfigPage（配置页） |
| 依赖 | components, hooks, api |

#### M5 — client/hooks 状态逻辑层

| 项 | 说明 |
|---|---|
| 职责 | 封装数据获取、状态管理和副作用逻辑 |
| hooks | useHotLists（聚合数据获取）、useConfig（配置读写）、useRefresh（刷新逻辑）、useKeywordMatch（关键字匹配标记） |
| 依赖 | api, context |

#### M6 — client/context 全局状态

| 项 | 说明 |
|---|---|
| 职责 | 跨页面共享的全局状态（配置数据） |
| 内容 | ConfigContext — 存储当前配置，供 HomePage 和 ConfigPage 共用 |
| 依赖 | shared 类型 |

#### M7 — server/routes 路由层

| 项 | 说明 |
|---|---|
| 职责 | 定义 REST API 端点，参数校验，调用 services |
| 路由 | GET /api/hot-lists, GET /api/hot-lists/:platform, POST /api/refresh, GET /api/config, POST /api/config |
| 依赖 | services, adapters |

#### M8 — server/adapters 适配器层

| 项 | 说明 |
|---|---|
| 职责 | 调用各平台 JSON 接口，清洗并统一输出 HotList |
| 适配器 | WeiboAdapter, ZhihuAdapter, BilibiliAdapter |
| 接口 | 每个适配器实现 `fetchHotList(): Promise<HotList>` |
| 依赖 | shared 类型 |

#### M9 — server/services 业务服务层

| 项 | 说明 |
|---|---|
| 职责 | 缓存管理、配置管理、定时调度 |
| 服务 | CacheService（内存缓存 + TTL + 失败回退）、ConfigService（JSON 文件读写）、SchedulerService（node-cron 定时刷新） |
| 依赖 | adapters, shared 类型 |

#### M10 — server/middleware 中间件层

| 项 | 说明 |
|---|---|
| 职责 | 请求级横切关注点 |
| 中间件 | cors（跨域）、errorHandler（统一错误响应格式） |
| 依赖 | 无 |

---

## 3. 模块关系与数据流

### 3.1 模块依赖图

```
┌─────────────────────────────────────────────────────────┐
│ 前端 (client)                                            │
│                                                          │
│  pages ──→ hooks ──→ api ──→ HTTP ──┐                   │
│    │         │                        │                  │
│    ▼         ▼                        │                  │
│  components  context                  │                  │
│                                       │                  │
└───────────────────────────────────────┼──────────────────┘
                                        │
┌───────────────────────────────────────┼──────────────────┐
│ 后端 (server)                         ▼                  │
│                                                          │
│  middleware ←── routes ──→ services ──→ adapters ──→ 平台API
│                 │            │                           │
│                 │          ┌─┴──────────┐               │
│                 │          │ CacheService│               │
│                 │          │ ConfigService│              │
│                 │          │ SchedulerSvc│               │
│                 │          └─────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### 3.2 核心数据流

#### 流程 1：首页加载

```
用户打开首页
  → HomePage 挂载
  → useHotLists hook 调用 api.fetchHotLists()
  → GET /api/hot-lists
  → routes 调用 CacheService.getOrFetch()
  → CacheService 检查 TTL
      ├─ [命中] 直接返回缓存数据
      └─ [未命中] 并行调用所有启用的 Adapter.fetchHotList()
           ├─ WeiboAdapter → 微博 JSON 接口 → 清洗 → HotList
           ├─ ZhihuAdapter → 知乎 JSON 接口 → 清洗 → HotList
           └─ BilibiliAdapter → B站 JSON 接口 → 清洗 → HotList
      → 写入缓存，设置 TTL
      → 返回 HotListResponse
  → 前端接收数据
  → useKeywordMatch 根据配置关键字标记命中条目
  → HotCard 组件渲染各平台卡片
  → 单个平台失败 → 该卡片显示 ErrorState，其他卡片正常
```

#### 流程 2：手动刷新

```
用户点击刷新按钮
  → RefreshButton 触发 useRefresh
  → api.triggerRefresh()
  → POST /api/refresh
  → routes 调用 CacheService.refreshAll()
  → 并行调用所有启用 Adapter.fetchHotList()
  → 更新缓存
  → 返回最新 HotListResponse
  → 前端更新展示
  → 若某平台失败 → 保留该平台旧缓存 + error 标记
```

#### 流程 3：配置读写

```
[读取]
  用户进入 ConfigPage
  → useConfig hook 调用 api.fetchConfig()
  → GET /api/config
  → ConfigService 读取 config.json 文件
  → 返回 AppConfig
  → ConfigForm 渲染当前配置

[写入]
  用户修改配置并保存
  → ConfigForm 调用 api.updateConfig(newConfig)
  → POST /api/config
  → ConfigService 写入 config.json 文件
  → 返回更新后的 AppConfig
  → ConfigContext 更新全局配置
  → HomePage 根据新配置重新标记关键字 / 调整展示数量
```

#### 流程 4：每日定时刷新

```
SchedulerService 启动时注册 node-cron 任务
  → cron 表达式对应每日 08:00
  → 触发 CacheService.refreshAll()
  → 并行调用所有启用 Adapter
  → 更新缓存
  → 记录刷新日志
```

### 3.3 失败隔离示意

```
并行请求 3 个平台：
  WeiboAdapter   → ✅ 成功 → HotList
  ZhihuAdapter   → ❌ 超时 → 返回旧缓存 + error: true
  BilibiliAdapter → ✅ 成功 → HotList

前端收到 3 个结果：
  微博卡片 → 正常展示最新数据
  知乎卡片 → 展示旧缓存 + 「数据可能不是最新」提示
  B站卡片 → 正常展示最新数据
```

---

## 4. 数据模型定义

### 4.1 共享类型 (shared/types.ts)

```ts
// 热榜条目
interface HotItem {
  rank: number;
  title: string;
  url: string;
  heat?: string | null;
  summary?: string;
  tag?: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

// 平台榜单
interface HotList {
  platform: 'weibo' | 'zhihu' | 'bilibili';
  platformName: string;
  sourceName: string;
  updatedAt: string;   // ISO 8601
  items: HotItem[];
  error?: boolean;
  message?: string;
}

// 聚合接口响应
interface HotListResponse {
  updatedAt: string;
  cache: {
    hit: boolean;
    ttl: number;
  };
  data: HotList[];
}

// 应用配置
interface AppConfig {
  keywords: string[];
  matchMode: 'any' | 'all' | 'exclude';
  sources: {
    weibo: boolean;
    zhihu: boolean;
    bilibili: boolean;
  };
  topN: number;              // 10 | 20 | 30
  refreshMode: 'manual' | 'scheduled' | 'both';
  scheduledTime: string;     // "08:00"
  cacheTTL: number;          // 秒，默认 300
}
```

### 4.2 错误响应格式

```ts
interface ErrorResponse {
  error: true;
  code: string;        // "UPSTREAM_ERROR" | "CACHE_ERROR" | "CONFIG_ERROR"
  message: string;
  details?: string;
}
```

---

## 5. 接口规格

### 5.1 接口总览

| 方法 | 路径 | 说明 | 对应需求 |
|---|---|---|---|
| GET | `/api/hot-lists` | 获取全部启用平台聚合热榜 | FR-HOME-01 |
| GET | `/api/hot-lists/:platform` | 获取单平台热榜 | 调试/扩展 |
| POST | `/api/refresh` | 强制刷新所有平台缓存 | FR-HOME-05 |
| GET | `/api/config` | 读取当前配置 | FR-CONFIG |
| POST | `/api/config` | 更新配置 | FR-CONFIG |

### 5.2 接口详细说明

#### GET /api/hot-lists

```
请求：无参数
响应：200 HotListResponse
     500 ErrorResponse

逻辑：
  1. 读取配置，获取启用的平台列表
  2. 对每个启用平台，检查缓存
  3. 缓存有效 → 使用缓存数据
  4. 缓存失效 → 调用对应 Adapter.fetchHotList()
  5. 某平台失败 → 尝试返回该平台旧缓存 + error 标记
  6. 返回聚合结果
```

#### GET /api/hot-lists/:platform

```
请求：platform = weibo | zhihu | bilibili
响应：200 HotList
     404 { error, message: "平台不存在" }
     500 ErrorResponse

逻辑：
  1. 校验 platform 参数
  2. 检查该平台缓存
  3. 缓存有效 → 直接返回
  4. 缓存失效 → 调用对应 Adapter.fetchHotList()
```

#### POST /api/refresh

```
请求：无 Body
响应：200 HotListResponse（含最新数据）
     500 ErrorResponse

逻辑：
  1. 强制绕过所有平台缓存
  2. 并行调用所有启用 Adapter.fetchHotList()
  3. 成功 → 更新缓存
  4. 失败 → 保留旧缓存，标记 error
  5. 返回聚合结果
```

#### GET /api/config

```
请求：无参数
响应：200 AppConfig
     500 ErrorResponse
```

#### POST /api/config

```
请求：Body 为部分或完整 AppConfig
响应：200 AppConfig（更新后的完整配置）
     400 { error, message: "配置格式错误" }
     500 ErrorResponse

说明：第一版仅本地开发环境可写入，部署到 Railway 后该接口通过中间件禁用写入。
```

---

## 6. 适配器设计

### 6.1 适配器接口

```ts
interface IAdapter {
  readonly platform: 'weibo' | 'zhihu' | 'bilibili';
  fetchHotList(): Promise<HotList>;
}
```

### 6.2 适配器列表

| 适配器 | 文件 | 数据源 |
|---|---|---|
| WeiboAdapter | server/src/adapters/weibo.adapter.ts | 微博热搜非官方 JSON 接口 |
| ZhihuAdapter | server/src/adapters/zhihu.adapter.ts | 知乎热榜非官方 JSON 接口 |
| BilibiliAdapter | server/src/adapters/bilibili.adapter.ts | B站热门非官方 JSON 接口 |

### 6.3 适配器实现规范

每个适配器必须：

1. 实现 IAdapter 接口
2. 内部完成 HTTP 请求 → JSON 解析 → 字段映射 → HotList 输出
3. 处理上游异常：超时 5 秒、非 2xx 响应、JSON 解析失败
4. 异常时抛出标准化错误对象 `{ code: string, message: string }`
5. 不在适配器内部处理缓存（缓存由 CacheService 统一管理）

### 6.4 字段映射（示例）

```
微博 API 响应字段          →  HotItem 字段
─────────────────────────────────────
rank                      →  rank
word / title              →  title
url / scheme              →  url
num / hot_score           →  heat
(raw_created_at)          →  createdAt
(new Date().toISOString())→  updatedAt
```

---

## 7. 服务设计

### 7.1 CacheService

```
职责：管理热榜数据的内存缓存

数据结构：
  Map<platform, {
    data: HotList;
    timestamp: number;   // 写入时间戳
  }>

核心方法：
  get(platform): HotList | null
  set(platform, data: HotList): void
  isValid(platform): boolean        // 判断缓存是否在 TTL 内
  getOrFetch(platform): Promise<HotList>
  refreshAll(): Promise<HotList[]>

TTL 机制：
  - 默认 TTL 从 AppConfig.cacheTTL 读取（默认 300 秒）
  - isValid() 对比当前时间与 timestamp
  - 过期自动触发 fetch

失败回退：
  - refreshAll 中某平台失败 → 保留旧缓存，在 HotList 上标记 error: true
  - 无旧缓存且失败 → 返回 HotList 含 error 标记 + 空 items
```

### 7.2 ConfigService

```
职责：管理应用配置的持久化读写

存储位置：server/config.json
内存缓存：读取后缓存在内存中，写操作同步更新文件 + 内存

核心方法：
  get(): AppConfig           // 返回当前配置（优先内存，回退读文件）
  update(partial: Partial<AppConfig>): AppConfig  // 合并写入文件

默认配置：
  {
    "keywords": [],
    "matchMode": "any",
    "sources": { "weibo": true, "zhihu": true, "bilibili": true },
    "topN": 20,
    "refreshMode": "both",
    "scheduledTime": "08:00",
    "cacheTTL": 300
  }

配置文件不存在时：自动创建并使用默认配置
```

### 7.3 SchedulerService

```
职责：注册每日定时刷新任务

实现：
  - 使用 node-cron 库
  - 服务启动时读取 config.scheduledTime，解析为 cron 表达式
  - 若 refreshMode 为 "scheduled" 或 "both"，注册定时任务
  - 触发时调用 CacheService.refreshAll()
  - 记录刷新日志（console.log + 时间戳）

注意：
  - Railway 免费层可能休眠，休眠期间定时任务不执行
  - 用户打开页面时，缓存过期自动触发刷新，弥补休眠期间的缺失
```

---

## 8. 前端架构设计

### 8.1 路由设计

| 路径 | 页面组件 | 说明 |
|---|---|---|
| `/` | HomePage | 首页，展示热榜卡片 |
| `/config` | ConfigPage | 配置页面 |

使用 react-router-dom v6，BrowserRouter 模式。

### 8.2 组件树

```
App
├── Layout
│   ├── Header（网站名称、说明、最后更新时间、刷新按钮）
│   ├── Outlet（路由内容区）
│   │   ├── HomePage
│   │   │   ├── HotCard（微博）
│   │   │   │   └── HotItemRow × 20
│   │   │   ├── HotCard（知乎）
│   │   │   │   └── HotItemRow × 20
│   │   │   └── HotCard（B站）
│   │   │       └── HotItemRow × 20
│   │   └── ConfigPage
│   │       ├── ConfigForm
│   │       │   ├── KeywordManager
│   │       │   ├── SourceSelector
│   │       │   ├── TopNSelector
│   │       │   └── RefreshConfig
│   │       └── SaveButton
│   └── Footer（页脚声明）
```

### 8.3 状态管理

| 状态 | 作用域 | 管理方式 |
|---|---|---|
| 热榜数据 | HomePage 内部 | useHotLists hook（useState + useEffect） |
| 刷新状态 | HomePage 内部 | useRefresh hook（loading / error） |
| 应用配置 | 全局（跨页面） | ConfigContext（React Context + useReducer） |
| 路由状态 | 全局 | react-router-dom |

### 8.4 关键字匹配逻辑（前端执行）

```
useKeywordMatch(hotItems: HotItem[], config: AppConfig) → HotItem[]

逻辑：
  1. 若 config.keywords 为空 → 直接返回原数据
  2. 对每条 HotItem.title 执行匹配
  3. matchMode = "any"   → title 包含任一关键字即命中
  4. matchMode = "all"   → title 包含所有关键字才命中
  5. matchMode = "exclude" → title 包含关键字则隐藏该条目
  6. "any" / "all" 模式下，命中条目标记 matched: true
  7. 返回处理后的列表（exclude 模式过滤，其他模式标记）
```

---

## 9. 开发环境配置

### 9.1 Vite 代理

```ts
// client/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

### 9.2 后端端口

```
PORT=3001  （避免与前端 Vite 默认 5173 冲突）
```

### 9.3 生产环境

```
前端 VITE_API_BASE 指向 Railway 后端域名
  - 开发：""（走 Vite proxy）
  - 生产："https://xxx.railway.app"
```

---

## 10. 风险与应对

| 风险 | 影响模块 | 应对措施 |
|---|---|---|
| 平台 JSON 接口不稳定 | adapters | 每个适配器独立错误处理 + 失败回退旧缓存 |
| 接口字段结构变更 | adapters | 适配器内字段映射集中管理，变更只改一个文件 |
| Railway 休眠导致定时任务不执行 | SchedulerService | 用户访问时缓存过期自动触发刷新，不依赖定时任务保底 |
| 配置 JSON 文件损坏 | ConfigService | 读取失败时返回默认配置，写操作做 JSON 校验 |
| 内存缓存随重启丢失 | CacheService | 第一版可接受；重启后首次请求自动拉取新数据 |

---

## 11. 验收对照

概要设计与 proposal.md 功能需求的对应关系：

| 需求编号 | 设计覆盖点 |
|---|---|
| FR-HOME-01 ~ 08 | 2.2 M3/M4 → 组件树 HotCard + HotItemRow；3.2 流程1 首页加载流 |
| FR-CONFIG-01 ~ 06 | 2.2 M6 → ConfigContext；3.2 流程3 配置读写；8.4 关键字匹配逻辑 |
| FR-CACHE-01 ~ 05 | 2.2 M9 → CacheService + SchedulerService；3.2 流程2/4 |
| FR-DEPLOY-01 ~ 03 | 1.1 部署；9 开发环境配置 |
