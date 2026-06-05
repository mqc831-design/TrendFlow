# M7 — server/routes 路由层

> REST API 端点定义，参数校验，调用 services。

## 子任务

- [ ] **M7-01** 创建 `server/src/routes/hot.ts`
  - `GET /` — 聚合热榜：读取启用的平台 → `cacheService.getOrFetchAll()` → 按 `topN` 截断 → 返回 `HotListResponse`
  - `GET /` 支持 `?refresh=1` 查询参数：传了则调用 `cacheService.refreshAll()` 强制绕过缓存
  - `GET /:platform` — 单平台热榜：校验 platform 合法性 → `cacheService.getOrFetch()` → 返回 `HotList`，同样支持 `?refresh=1`
  - 无效 platform 返回 `PLATFORM_NOT_FOUND` 错误
  - 所有 async 错误统一 `next(err)`
- [ ] **M7-02** 创建 `server/src/routes/config.ts`
  - `GET /` — 返回 `configService.get()` 结果
  - `POST /` — 校验 body：topN ∈ {10,20,30}、matchMode ∈ {any,all,exclude}、cacheTTL ∈ [60,3600]
  - 校验失败抛出 `CONFIG_INVALID` 错误
  - 通过后调用 `configService.update(body)` 返回新配置
- [ ] **M7-03** 创建 `server/src/routes/index.ts`
  - 创建 `apiRouter`
  - 挂载 `hotRouter` 到 `/hot-lists`
  - 挂载 `configRouter` 到 `/config`（经过 `configGuard`）
  - `POST /refresh` 独立路径：`cacheService.refreshAll()` + 按 `topN` 截断
  - `GET /health` 独立路径：返回 `{ ok: true }`
  - 导出 `apiRouter`

## 产出物

- `server/src/routes/hot.ts`
- `server/src/routes/config.ts`
- `server/src/routes/index.ts`

## 依赖

- M10（middleware: AppError, configGuard）
- M9（services: cacheService, configService）
- M1（shared 类型）
