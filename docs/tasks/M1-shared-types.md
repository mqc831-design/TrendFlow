# M1 — shared 共享类型

> 定义前后端共用的 TypeScript 类型，纯类型文件，无运行逻辑。

## 子任务

- [ ] **M1-01** 创建 `shared/types.ts`，定义所有共享类型
  - `Platform` 类型（`'weibo' | 'zhihu' | 'bilibili'`）
  - `HotItem` 接口（rank, title, url, heat?, summary?, tag?, createdAt, updatedAt）
  - `HotItemMatched` 接口（extends HotItem，加 matched?, highlightedTitle?）
  - `HotList` 接口（platform, platformName, sourceName, updatedAt, items, error?, message?）
  - `HotListResponse` 接口（updatedAt, cache { hit, ttl }, data: HotList[]）
  - `AppConfig` 接口（keywords, matchMode, sources, topN, refreshMode, scheduledTime, cacheTTL）
  - `AppConfigPartial` 类型（Partial<AppConfig>）
  - `ErrorResponse` 接口（error, code, message, details?）
  - 所有接口均用 `export` 导出
- [ ] **M1-02** 配置前端 `client/tsconfig.json` paths，`@shared/*` → `../shared/*`
- [ ] **M1-03** 配置后端 `server/tsconfig.json` paths，`@shared/*` → `../shared/*`
- [ ] **M1-04** 运行 `tsc --noEmit` 验证类型编译通过（双方）

## 产出物

- `shared/types.ts`
- `client/tsconfig.json`（paths 配置）
- `server/tsconfig.json`（paths 配置）

## 依赖

无
