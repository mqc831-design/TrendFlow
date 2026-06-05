# 今日热搜 · 开发进度（v2）

> 最后更新：2026-06-05 — 全部完成 ✅ 255 tests passing

## 模块完成状态

- [x] **SC** 项目脚手架 & 入口文件 — `docs/tasks/scaffolding.md`
- [x] **M1** shared 共享类型 — `docs/tasks/M1-shared-types.md`
- [x] **M10** server/middleware 中间件 — `docs/tasks/M10-middleware.md`
- [x] **M9** server/services 业务服务层 — `docs/tasks/M9-services.md`
- [x] **M8** server/adapters 适配器层 — `docs/tasks/M8-adapters.md`
- [x] **M7** server/routes 路由层 — `docs/tasks/M7-routes.md`
- [x] **M2** client/api API 请求层 — `docs/tasks/M2-api-client.md`
- [x] **M6** client/context 全局状态 — `docs/tasks/M6-config-context.md`
- [x] **M5** client/hooks 状态逻辑层 — `docs/tasks/M5-hooks.md`
- [x] **M3** client/components 组件层 — `docs/tasks/M3-components.md`
- [x] **M4** client/pages 页面层 — `docs/tasks/M4-pages.md`

## 执行顺序

```
Phase 1:  SC-01~03   根 + 两端 package.json + tsconfig
Phase 2:  M1         shared/types.ts
Phase 3:  SC-04~07   后端入口：config.ts, app.ts, index.ts, config.json
          SC-08~11   前端入口：package.json, tsconfig, vite.config, index.html
Phase 4:  M10        middleware
Phase 5:  M8         adapters
Phase 6:  M9         services
Phase 7:  M7         routes
Phase 8:  M2         client/api
Phase 9:  M6         client/context
Phase 10: M5         client/hooks
Phase 11: M3         client/components
Phase 12: M4         client/pages
Phase 13: SC-12~14   App.tsx + main.tsx + index.css
Phase 14: SC-15~17   vercel.json + .gitignore + npm install
```

## v2 变更摘要

| 变更 | 影响模块 |
|---|---|
| Mock 数据统一在后端 adapter，不建前端 mock JSON | M8 |
| HotCard 三态（loading 骨架屏 + error 重试 + success） | M3 |
| 相对时间显示（"更新于 X 分钟前"） | M3, M4 |
| GET /api/health 端点 | M7 |
| GET /api/hot-lists?refresh=1 强制刷新 | M7, M9 |
| 缓存命中/未命中日志 `[cache hit]` / `[cache miss]` | M9 |
| TTL 优先读环境变量 CACHE_TTL，默认 600 秒 | M9 |
| ESM `.js` 后缀、export 方式、mock 路径等经验规则 | §5.3 |
