# M10 — server/middleware 中间件

> 请求级横切关注点：CORS、统一错误处理、配置写入守卫。

## 子任务

- [ ] **M10-01** 创建 `server/src/middleware/cors.ts`
  - 用 `cors` 库配置 CORS
  - origin 白名单：`http://localhost:5173` + `CLIENT_ORIGIN` 环境变量
  - methods: GET, POST
  - allowedHeaders: Content-Type
  - 导出 `corsMiddleware`
- [ ] **M10-02** 创建 `server/src/middleware/errorHandler.ts`
  - 定义 `AppError` 类（statusCode, code, message, details?）
  - 定义 `errorHandler` 中间件（4 参数签名）
  - AppError → 按 statusCode + 标准 ErrorResponse 格式返回
  - 未知错误 → 500 + `INTERNAL_ERROR`
  - 导出 `AppError` 和 `errorHandler`
- [ ] **M10-03** 创建 `server/src/middleware/configGuard.ts`
  - `configGuard` 中间件：当 `NODE_ENV === 'production'` 且 `req.method === 'POST'` 时抛出 403
  - 错误码 `CONFIG_WRITE_DISABLED`

## 产出物

- `server/src/middleware/cors.ts`
- `server/src/middleware/errorHandler.ts`
- `server/src/middleware/configGuard.ts`

## 依赖

无（M1 类型仅 errorHandler 用到 ErrorResponse，可在实现时 import）
