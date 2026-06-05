# 今日热搜 · 操作手册

## 目录

- [1. 环境要求](#1-环境要求)
- [2. 快速启动](#2-快速启动)
- [3. 项目结构](#3-项目结构)
- [4. 常用命令](#4-常用命令)
- [5. 配置说明](#5-配置说明)
- [6. 测试](#6-测试)
- [7. 构建与部署](#7-构建与部署)
- [8. 故障排查](#8-故障排查)

---

## 1. 环境要求

| 依赖 | 最低版本 |
|---|---|
| Node.js | 18.x |
| npm | 9.x |

## 2. 快速启动

```bash
# 1. 克隆项目后进入目录
cd TrendFlow

# 2. 安装依赖（根目录 workspaces 会自动装 client 和 server）
npm install

# 3. 启动后端（终端 1）
cd server
npm run dev
# → [Server] 今日热搜后端已启动: http://localhost:3001

# 4. 启动前端（终端 2）
cd client
npm run dev
# → Vite dev server: http://localhost:5173
```

浏览器打开 `http://localhost:5173` 即可看到首页。前端 `/api` 请求通过 Vite proxy 自动转发到后端 `localhost:3001`。

## 3. 项目结构

```
TrendFlow/
├── shared/types.ts              # 前后端共用类型
├── server/                       # 后端 (Express + TypeScript)
│   ├── config.json               # 运行时配置文件
│   ├── src/
│   │   ├── index.ts              # 启动入口
│   │   ├── app.ts                # Express 应用组装
│   │   ├── config.ts             # 环境变量读取
│   │   ├── middleware/           # cors, errorHandler, configGuard
│   │   ├── adapters/             # 微博/知乎/B站 数据源适配器
│   │   ├── services/             # 缓存, 配置管理, 定时调度
│   │   └── routes/               # API 路由
│   └── vitest.config.ts
├── client/                       # 前端 (React + Vite)
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx              # 入口
│   │   ├── App.tsx               # 路由配置
│   │   ├── api/client.ts         # 后端 API 请求封装
│   │   ├── context/              # 全局配置 Context
│   │   ├── hooks/                # useHotLists, useRefresh, useKeywordMatch
│   │   ├── components/           # 8 个 UI 组件
│   │   ├── pages/                # HomePage, ConfigPage
│   │   └── index.css             # 全局样式
│   ├── vite.config.ts            # Vite 配置（含 /api proxy）
│   └── vercel.json               # Vercel SPA 部署配置
└── docs/                         # 文档
```

## 4. 常用命令

### 后端（server 目录）

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动开发服务器（热重载，监听 3001 端口） |
| `npm run build` | TypeScript 编译到 dist/ |
| `npm run start` | 生产模式启动（需先 build） |
| `npm test` | 运行所有后端单元测试 |

### 前端（client 目录）

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动 Vite 开发服务器（热重载，监听 5173 端口） |
| `npm run build` | 类型检查 + 生产构建到 dist/ |
| `npm run preview` | 预览生产构建 |
| `npm test` | 运行所有前端单元测试 |

## 5. 配置说明

### 5.1 运行时配置（server/config.json）

修改后即时生效（下次请求时读取），无需重启：

```json
{
  "keywords": ["AI", "安全"],       // 关注关键字列表
  "matchMode": "any",               // any | all | exclude
  "sources": {                       // 启用的数据源
    "weibo": true,
    "zhihu": true,
    "bilibili": true
  },
  "topN": 20,                        // 每平台展示条数：10 | 20 | 30
  "refreshMode": "both",             // manual | scheduled | both
  "scheduledTime": "08:00",          // 定时刷新时间（HH:mm）
  "cacheTTL": 600                    // 缓存有效期（秒）
}
```

也可以通过配置页面 `http://localhost:5173/config` 在线修改（仅开发环境）。

### 5.2 环境变量

创建 `server/.env` 文件（可选，不提交到 Git）：

```env
PORT=3001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# 数据源 API 地址（留空则使用内置 Mock 数据）
WEIBO_API_URL=
ZHIHU_API_URL=
BILIBILI_API_URL=
```

**Mock 数据模式**：三个 API URL 留空时，每个适配器返回 20 条结构完整的模拟数据。可正常开发和调试前端，无需依赖外部接口。

**真实数据模式**：填入实际的 API 地址后，适配器自动切换到真实请求。

### 5.3 缓存机制

- 缓存 TTL 默认 600 秒（config.json 中的 `cacheTTL` 或环境变量 `CACHE_TTL`）
- 缓存失效时自动重新拉取
- 上游接口失败时回退到旧缓存（即使已过期）
- 页面刷新按钮可强制绕过 TTL 拉取最新数据
- 每天 08:00 自动刷新一次（`refreshMode` 为 `scheduled` 或 `both` 时）

### 5.4 生产环境保护

- `NODE_ENV=production` 时，`POST /api/config` 接口被禁用（返回 403）
- 生产环境请通过 `server/config.json` 文件直接修改配置

## 6. 测试

### 运行全部测试

```bash
# 后端测试（13 个文件，约 156 个用例）
cd server
npm test

# 前端测试（16 个文件，约 146 个用例）
cd client
npm test
```

### 运行单个测试文件

```bash
# 后端：测试缓存服务
cd server
npx vitest run src/services/__test__/cacheService.test.ts

# 前端：测试关键字匹配 Hook
cd client
npx vitest run src/hooks/__test__/useKeywordMatch.test.ts
```

### 查看测试覆盖率

```bash
# 后端
cd server
npx vitest run --coverage

# 前端
cd client
npx vitest run --coverage
```

## 7. 构建与部署

### 7.1 前端部署到 Vercel

```bash
cd client
npm run build        # 产出到 client/dist/

# 部署（需先安装 Vercel CLI）
vercel --prod
```

或连接 GitHub 仓库后自动部署，Vercel 会识别 `client/` 目录下的 `vercel.json`。

**环境变量**（Vercel Dashboard 中设置）：
```
VITE_API_BASE=https://your-backend.railway.app
```

### 7.2 后端部署到 Railway

```bash
cd server
npm run build        # 编译 TypeScript

# 部署（需先安装 Railway CLI）
railway up
```

**环境变量**（Railway Dashboard 中设置）：
```
PORT=3001
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend.vercel.app
WEIBO_API_URL=<微博API地址>
ZHIHU_API_URL=<知乎API地址>
BILIBILI_API_URL=<B站API地址>
```

## 8. 故障排查

### 前端页面空白

1. 确认后端已启动：`curl http://localhost:3001/api/hot-lists`
2. 确认前端 Vite proxy 生效：检查 `client/vite.config.ts` 中 proxy 配置
3. 打开浏览器 DevTools → Network 查看 `/api/hot-lists` 请求状态

### 某平台卡片显示"数据获取失败"

1. 检查 `server/config.json` 中 `sources` 该平台是否启用
2. 检查对应环境变量中的 API URL 是否正确
3. 检查后端控制台是否有 `UPSTREAM_ERROR` 日志
4. 其他平台卡片应正常显示（失败隔离机制）

### 配置修改不生效

1. 确认 `NODE_ENV` 不是 `production`（生产环境禁止 API 写入）
2. 直接检查 `server/config.json` 文件内容是否更新
3. JSON 格式错误时，系统会自动回退到默认配置

### 单元测试失败

1. 确认依赖已安装：`npm install`
2. 确认在正确的目录下运行测试（server 或 client）
3. 检查 vitest.config.ts 中 `@shared` 路径别名是否正确

### 端口冲突

```
# 修改后端端口
PORT=3002 npm run dev          # 临时
# 或修改 server/.env: PORT=3002  # 永久

# 修改前端端口
# 编辑 client/vite.config.ts:
server: { port: 5174 }
```

---

## 附录：API 接口速查

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/hot-lists` | 获取所有启用平台聚合热榜 |
| GET | `/api/hot-lists/:platform` | 获取单平台热榜（weibo/zhihu/bilibili） |
| POST | `/api/refresh` | 强制刷新所有平台数据 |
| GET | `/api/config` | 读取当前配置 |
| POST | `/api/config` | 更新配置（开发环境可用） |
