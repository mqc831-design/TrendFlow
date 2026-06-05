# 今日热搜 — 多平台热榜聚合

微博、知乎、B站热榜数据聚合展示，前后端分离架构。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite + CSS Modules |
| 后端 | Node.js + Express + TypeScript（tsx 运行时） |
| 缓存 | 内存 Map，TTL 600 秒 |
| 测试 | Vitest |

## 快速开始

```bash
npm install

# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:server   # 后端 → localhost:3001
npm run dev:client   # 前端 → localhost:5173
```

访问 http://localhost:5173

## 部署说明

### 架构

```
浏览器 ──→ 前端 (Vite / React) ──→ 后端 (Express) ──→ 微博/知乎/B站 API
   ↑                                ↑
   └── 同域或跨域（CORS）───────────┘
```

- **开发环境**：前端 `localhost:5173` 通过 Vite proxy 转发 `/api` 到后端 `localhost:3001`
- **生产同域**：前端构建产物由 Express 托管（或 Nginx），`VITE_API_BASE` 留空，请求同域 `/api`
- **生产跨域**：前后端分别部署，`VITE_API_BASE` 设为后端完整地址

### 环境变量清单

#### 后端（server/.env）

| 变量 | 必须 | 说明 |
|------|:--:|------|
| `PORT` | 否 | 后端端口，默认 `3001` |
| `NODE_ENV` | 否 | `development` 或 `production` |
| `CLIENT_ORIGIN` | 跨域时 | 前端域名，如 `https://app.example.com` |
| `WEIBO_API_URL` | 否 | 留空=Mock，不设=默认官方接口 |
| `ZHIHU_API_URL` | 否 | 同上 |
| `BILIBILI_API_URL` | 否 | 同上 |
| `CACHE_TTL` | 否 | 缓存秒数，默认 `600`（10 分钟） |
| `MOCK_FAIL_*` | 否 | 故障模拟开关，仅开发环境使用 |

#### 前端（client/.env.production）

| 变量 | 必须 | 说明 |
|------|:--:|------|
| `VITE_API_BASE` | 跨域时 | 后端地址，如 `https://api.example.com`；同域留空 |

> **注意**：`VITE_API_BASE` 是 Vite 编译时变量，构建时注入。如需修改，需重新构建。

### 构建

```bash
npm install

# 完整构建（server + client）
npm run build

# 或分别构建
npm run build:server   # tsc → server/dist/
npm run build:client   # vite build → client/dist/
```

### 启动生产服务

```bash
# 从项目根目录
npm run start
```

默认监听 `http://localhost:3001`。

### 平台部署指南

#### Railway（部署后端）

1. 创建 Railway 项目，关联代码仓库
2. 在 Settings → Environment 中添加变量：

```
PORT=3001
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend.vercel.app
CACHE_TTL=600
```

3. **Start Command** 设为：

```
npm run build -w server && npm run start -w server
```

> 💡 也可直接用 tsx 运行时（跳过 tsc 编译）：
> ```
> npx tsx server/src/index.ts
> ```

4. 部署完成后，Railway 会提供一个 `*.railway.app` 域名

#### Vercel / Netlify（部署前端）

1. 关联代码仓库
2. 构建设置：

| 配置项 | 值 |
|--------|-----|
| Build Command | `npm run build -w client` |
| Output Directory | `client/dist` |

3. 环境变量（仅跨域部署时需要）：

```
VITE_API_BASE=https://your-backend.railway.app
```

4. 部署完成后，前端可通过 Vercel/Netlify 域名访问

#### 验证部署

```bash
# 后端健康检查
curl https://your-backend.railway.app/api/health
# → {"ok":true}

# 热榜数据
curl https://your-backend.railway.app/api/hot-lists
# → {"updatedAt":"...","cache":{"hit":true,"ttl":600},"data":[...]}

# 前端页面
open https://your-frontend.vercel.app
# 应看到三列热榜卡片，每列 20 条
```

### 常见问题

**Q: 前端白屏，控制台报 CORS 错误？**
→ 检查 `CLIENT_ORIGIN` 是否设为前端域名（含协议，如 `https://app.example.com`）

**Q: 后端启动后热榜无数据？**
→ 检查 `*_API_URL` 环境变量：设为空字符串会走 Mock，设为不存在的 URL 会返回 error。确保服务器能访问外网。

**Q: 如何验证环境变量已生效？**
→ 访问 `/api/config`，检查返回的 `cacheTTL` 等字段是否与设置一致。

## 数据来源说明

本项目通过后端代理获取各平台热榜数据，前端不直接请求第三方域名。

| 平台 | 接口 | 方式 |
|------|------|------|
| 微博 | `https://weibo.com/ajax/side/hotSearch` | 官方 Ajax 接口，免费，无需认证 |
| 知乎 | `https://www.zhihu.com/api/v3/feed/topstory/hot-list-web?limit=50` | 官方 Feed 接口，免费，无需认证 |
| B站 | `https://api.bilibili.com/x/web-interface/popular` | 官方 Web API，免费，无需认证 |

**条数控制**：由 `server/config.json` 的 `topN` 字段统一控制（默认 20），adapter 层不硬编码条数。

**缓存策略**：内存 Map 缓存，TTL 默认 600 秒（10 分钟）。优先读环境变量 `CACHE_TTL`，回落 `config.json cacheTTL`。

## 免责声明

本项目为**学习用途**的非商业项目，所有热榜数据版权归各平台（微博、知乎、哔哩哔哩）所有。数据抓取行为请遵守各平台 robots.txt 及用户协议，请勿用于商业目的或高频请求。
