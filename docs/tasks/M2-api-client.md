# M2 — client/api API 请求层

> 封装所有对后端 HTTP 请求，统一错误处理。

## 子任务

- [ ] **M2-01** 创建 `client/src/api/client.ts`
  - `BASE_URL`：开发环境 `""`（走 Vite proxy），生产环境读 `VITE_API_BASE`
  - 通用 `request<T>(path, options?)` 封装：拼接 URL → fetch → 非 ok 抛 `ApiError`
  - `ApiError` 类：包含 status + body（code, message, details）
  - `fetchHotLists(): Promise<HotListResponse>` → `GET /api/hot-lists`
  - `fetchHotList(platform): Promise<HotList>` → `GET /api/hot-lists/:platform`
  - `triggerRefresh(): Promise<HotListResponse>` → `POST /api/refresh`
  - `fetchConfig(): Promise<AppConfig>` → `GET /api/config`
  - `updateConfig(data): Promise<AppConfig>` → `POST /api/config`
  - 导出所有函数 + `ApiError` 类
  - re-export 类型：`HotListResponse`, `HotList`, `AppConfig`, `AppConfigPartial`

## 产出物

- `client/src/api/client.ts`

## 依赖

- M1（shared 类型）
