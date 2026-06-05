# 项目脚手架 & 入口文件

> 项目初始化：package.json、TypeScript 配置、Vite 配置、入口文件、全局样式。

## 子任务

### 根目录

- [ ] **SC-01** 创建根目录 `package.json`（workspaces: client, server）

### 后端

- [ ] **SC-02** 创建 `server/package.json`
  - dependencies: express, cors, node-cron, dotenv
  - devDependencies: typescript, tsx, @types/express, @types/cors, @types/node-cron, @types/node
  - scripts: dev (tsx watch src/index.ts), build (tsc), start (node dist/index.js)
- [ ] **SC-03** 创建 `server/tsconfig.json`
  - paths: `@shared/*` → `../shared/*`
  - target: ES2022, module: commonjs, outDir: dist, rootDir: src
- [ ] **SC-04** 创建 `server/src/config.ts`
  - 加载 dotenv
  - 导出 `env` 对象：PORT (默认3001), NODE_ENV, CLIENT_ORIGIN, WEIBO_API_URL, ZHIHU_API_URL, BILIBILI_API_URL
- [ ] **SC-05** 创建 `server/src/app.ts`
  - 创建 Express app
  - 调用 `initAdapters()` 注册适配器
  - 使用 corsMiddleware
  - 使用 express.json()
  - 挂载 apiRouter 到 `/api`
  - 使用 errorHandler（路由之后）
  - 导出 `app`
- [ ] **SC-06** 创建 `server/src/index.ts`
  - `app.listen(env.PORT)` 启动服务
  - 打印启动日志
  - 调用 `schedulerService.start()`
- [ ] **SC-07** 创建 `server/config.json`（默认配置初始值）

### 前端

- [ ] **SC-08** 创建 `client/package.json`
  - dependencies: react, react-dom, react-router-dom
  - devDependencies: typescript, vite, @vitejs/plugin-react, @types/react, @types/react-dom
  - scripts: dev (vite), build (tsc && vite build), preview (vite preview)
- [ ] **SC-09** 创建 `client/tsconfig.json`
  - paths: `@shared/*` → `../shared/*`
  - jsx: react-jsx, module: ESNext, moduleResolution: bundler
- [ ] **SC-10** 创建 `client/vite.config.ts`
  - react 插件
  - server.proxy: `/api` → `http://localhost:3001`
- [ ] **SC-11** 创建 `client/index.html`（Vite 入口 HTML）
- [ ] **SC-12** 创建 `client/src/App.tsx`
  - BrowserRouter + ConfigProvider
  - Routes: `/` → HomePage, `/config` → ConfigPage
  - Layout 作为父路由
- [ ] **SC-13** 创建 `client/src/main.tsx`
  - StrictMode + createRoot + render App
  - 导入全局 CSS
- [ ] **SC-14** 创建 `client/src/index.css`（全局样式）
  - CSS 变量（颜色、间距、字体）
  - 响应式布局基础
  - 桌面端 3 列卡片网格（`.home-page__grid`）
  - 移动端 1 列（@media max-width: 768px）
  - 排名 1～3 视觉强调样式（金色/银色/铜色）

### Vercel / Railway

- [ ] **SC-15** 创建 `client/vercel.json`（SPA rewrite 规则）
- [ ] **SC-16** 创建 `.gitignore`（node_modules, dist, .env, config.json 排除等）
- [ ] **SC-17** 安装依赖 & 验证 `npm install` 成功

## 产出物

- `package.json`（根）
- `server/package.json`, `server/tsconfig.json`
- `server/src/config.ts`, `server/src/app.ts`, `server/src/index.ts`
- `server/config.json`
- `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`
- `client/index.html`
- `client/src/App.tsx`, `client/src/main.tsx`, `client/src/index.css`
- `client/vercel.json`
- `.gitignore`

## 依赖

所有模块
