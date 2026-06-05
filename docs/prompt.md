# 今日热搜 · VibeCoding 自主构建 Prompt（v2）

> 本 Prompt 用于 Claude Code 主 Agent。主 Agent 读取后，按依赖顺序逐个生成子 Agent 实现每个模块，自动完成测试，全程无需人工参与。

---

## 1. 角色定义

你是一个**全栈项目构建主 Agent**，负责按设计文档和任务划分，自主完成「今日热搜」项目的全部代码编写和测试。

你的职责：
- 读取项目文档，理解架构和模块依赖关系
- 按依赖拓扑顺序调度各模块的实现
- 为每个模块生成独立的子 Agent（Claude Code Agent）编写代码和测试
- 每个模块完成后运行测试验证，通过后方可进入下一模块
- 维护 `docs/tasks/progress.md` 中的进度状态

---

## 2. 项目概述

**今日热搜** — 多平台热榜聚合网站。聚合微博、知乎、B 站三个平台的公开热榜数据，以卡片网格形式在首页展示。

| 层级 | 技术 |
|---|---|
| 前端 | React + TypeScript + Vite |
| 样式 | CSS Modules（禁止引入 Tailwind） |
| 后端 | Node.js + Express + TypeScript（tsx 运行时） |
| 缓存 | 内存 Map（TTL 默认 600 秒，读环境变量 `CACHE_TTL`，回落 config.json cacheTTL） |
| 配置存储 | server/config.json |
| 测试 | Vitest |
| 类型检查 | tsc --noEmit |

Mock 数据策略：**统一维护在后端 adapter 代码中**，每个适配器提供 ≥20 条结构完整的 Mock 数据。前端不创建独立的 mock JSON 文件。

---

## 3. 项目文档索引

在执行前，你必须阅读以下全部文档以建立完整上下文：

```
docs/proposal.md              # 需求规格说明书
docs/high-level-design.md     # 概要设计（模块划分、数据流、接口规格）
docs/low-level-design.md      # 详细设计（每个模块的文件路径、函数签名、数据结构、处理逻辑、JSON 示例）
docs/tasks/progress.md        # 总体进度追踪
docs/tasks/scaffolding.md     # SC — 项目脚手架
docs/tasks/M1-shared-types.md # M1 — shared 共享类型
docs/tasks/M10-middleware.md  # M10 — server/middleware 中间件
docs/tasks/M9-services.md    # M9 — server/services 业务服务层
docs/tasks/M8-adapters.md    # M8 — server/adapters 适配器层
docs/tasks/M7-routes.md      # M7 — server/routes 路由层
docs/tasks/M2-api-client.md  # M2 — client/api API 请求层
docs/tasks/M6-config-context.md # M6 — client/context 全局状态
docs/tasks/M5-hooks.md       # M5 — client/hooks 状态逻辑层
docs/tasks/M3-components.md  # M3 — client/components 组件层
docs/tasks/M4-pages.md       # M4 — client/pages 页面层
```

---

## 4. 模块依赖图（决定执行顺序）

```
Phase 1:  SC-01~03   根 + 两端 package.json + tsconfig
Phase 2:  M1         shared/types.ts（无依赖，前后端都需要）
Phase 3:  SC-04~07   后端入口：config.ts, app.ts, index.ts, config.json
          SC-08~11   前端入口：package.json, tsconfig, vite.config, index.html
Phase 4:  M10        middleware（无依赖，后端其他模块需要它的 AppError）
Phase 5:  M8         adapters（依赖 M1 + M10.AppError）
Phase 6:  M9         services（依赖 M1 + M8，CacheService 直接 import adapterFactory）
Phase 7:  M7         routes（依赖 M9 + M10）
Phase 8:  M2         client/api（依赖 M1）
Phase 9:  M6         client/context（依赖 M1 + M2）
Phase 10: M5         client/hooks（依赖 M1 + M2）
Phase 11: M3         client/components（依赖 M1 + M6）
Phase 12: M4         client/pages（依赖 M3 + M5 + M6）
Phase 13: SC-12~14   App.tsx + main.tsx + index.css（依赖全部模块）
Phase 14: SC-15~17   vercel.json + .gitignore + npm install 验证
```

**规则**：
- 同一 Phase 内的模块可以并行（生成多个子 Agent 同时执行）
- 跨 Phase 必须串行（下一 Phase 在所有上一 Phase 的子 Agent 全部成功返回后才能开始）
- M8 → M9 必须串行（CacheService import adapterFactory）

---

## 5. 子 Agent 生成规范

### 5.1 子 Agent 的 Prompt 结构

每次生成子 Agent 时，你必须按以下结构编写 prompt：

```
你是一个前端/后端开发 Agent。你的任务是实现 [模块名称]。

## 上下文
[从详细设计文档中摘取该模块相关的全部内容，包括：
 - 文件路径清单
 - 类型/函数签名
 - 处理逻辑描述
 - JSON 示例（API 模块）
 - 边界条件
 - 独立测试方式]

## 已有文件
[列出当前项目中已存在的文件路径，帮助子 Agent 理解已有上下文]

## 要创建/修改的文件
[从任务清单中提取该模块的所有文件]

## 技术要求
- 所有代码使用 TypeScript
- 前端组件用 CSS Modules（.module.css），禁止引入 Tailwind
- 导入 shared 类型用 @shared/types 路径
- 后端 ESM 模块：import 语句必须使用 `.js` 扩展名
- 后端用 tsx 运行时（不需要预编译）
- 后端适配器的 API URL 从环境变量读取，默认值使用 Mock 数据返回（Mock 数据统一在后端 adapter 代码中维护，不创建前端 mock JSON 文件）
- 组件导出方式：明确指定是 named export 还是 default export，并在 prompt 中写明，避免子 Agent 猜测

## 测试要求
- 使用 Vitest 编写单元测试
- 测试文件放在模块同目录的 __test__/ 子目录下
- 测试覆盖率目标：核心逻辑路径 100% 覆盖
- Mock 所有外部依赖（fetch、文件系统、数据库等）
- 测试命令：npx vitest run <test-file> --config <vitest-config>
- 测试中 mock 路径需根据模块实际目录层级计算，在 prompt 中明确给出 mock 路径示例

## 完成标准
- 所有文件已创建
- tsc --noEmit 通过（在该模块相关目录下运行）
- vitest run 全部通过
- 返回：创建/修改的文件清单 + 测试结果摘要
```

### 5.2 Mock 数据规范（适配器专用）

Mock 数据**统一维护在后端 adapter 代码中**，不创建前端独立 mock JSON 文件。

```ts
// 适配器模式：先尝试环境变量，没有则返回内置 Mock 数据（含 ≥20 条）
class WeiboAdapter implements IAdapter {
  private get apiUrl(): string {
    return process.env.WEIBO_API_URL || '';
  }

  async fetchHotList(): Promise<HotList> {
    if (this.apiUrl) {
      return this.fetchFromRemote();
    }
    return this.fetchMock();
  }

  private fetchMock(): Promise<HotList> {
    // 返回 20 条结构完整的模拟数据
  }
}
```

Mock 数据要求：
- 每个适配器提供 ≥20 条数据（满足 topN=20 的默认配置）
- 字段齐全：rank, title, url, heat, tag, summary 按规则有值或 null
- heat 部分条目故意为 null（验证「暂无热度」展示）
- tag 包含「热」「新」「荐」等多样性
- createdAt/updatedAt 使用当前时间的 ISO 8601 格式

### 5.3 v1 执行经验（必须遵守）

以下问题在 v1 执行中踩过坑，v2 必须在子 Agent prompt 中明确说明：

| 问题 | 解决方案 |
|---|---|
| Layout 是 named export 还是 default | **明确写在 prompt 中**：如"Layout 使用 default export" |
| useKeywordMatch 不能在 Array.map 回调中调用（React hook 规则） | HomePage 中使用**纯函数 matchKeywords() + useMemo**，不要用 hook 在 map 中 |
| 后端 ESM 需要 `.js` 后缀 | 所有 import 路径必须带 `.js`：`import { AppError } from '../middleware/errorHandler.js'` |
| ConfigForm 测试需要 mock useConfigContext | prompt 中明确写：`vi.mock('../../context/ConfigContext', () => ({ useConfigContext: vi.fn() }))` |
| HotCard 的 Outlet 依赖 | 测试中 Layout 用 MemoryRouter 包裹 |
| catch 块静默吞错（`catch {}` 无参数），错误完全不可见，排查困难 | **catch 块至少 `console.warn` 输出错误信息**，如 `catch (err) { console.warn('xxx 失败:', err instanceof Error ? err.message : err); ... }` |
| PowerShell `Set-Content -Encoding utf8` 写入 UTF-8 BOM，导致 JSON 解析失败 | **禁止用 PowerShell 创建文件**。必须用 Write 工具（自动无 BOM）。若必须用 PowerShell，指定 `-Encoding utf8NoBOM`（仅 PS7+），或用 `[System.Text.UTF8Encoding]::new(\$false)` 写入 |
| 远程抓取缺少 UA/Referer 会被反爬；字段映射无注释导致 API 变更时难定位 | **fetchFromRemote 必须设置移动端 User-Agent 和对应平台 Referer；JSON 解析处加字段映射注释**（格式：`// API字段映射: xxx→yyy`），方便接口变更时修改 |

---

## 6. 进度追踪规则

### 6.1 开始前
- 读取 `docs/tasks/progress.md`，检查哪些模块已标记 `[x]`
- 跳过已完成的模块

### 6.2 每个模块完成后
1. 子 Agent 返回后，你必须验证：
   - 运行 `tsc --noEmit`（该模块目录）确认无类型错误
   - 运行 `npx vitest run` 确认全部测试通过
2. 验证通过后：
   - 将 `progress.md` 中对应模块的 `[ ]` 改为 `[x]`
   - 进入对应模块任务文件（如 `M1-shared-types.md`），将所有子任务改为 `[x]`
3. 验证失败时：
   - 分析失败原因
   - 生成修复子 Agent 或直接修复
   - 修复后重新验证

### 6.3 全部完成后
- 运行 `npm test`（如有根级配置）确认全项目测试通过
- 尝试启动前后端验证无运行时错误
- 标记 `progress.md` 全部完成

---

## 7. 代码风格规则

```
- 组件名 PascalCase，函数名 camelCase
- 接口路径：/api/hot-lists, /api/hot-lists/:platform, /api/refresh, /api/config, /api/health
- 前端禁止直接 fetch 微博/知乎/B站原始域名（所有请求走后端代理）
- 上游请求加合理 User-Agent、Referer 头
- 缓存 TTL 默认 600 秒，优先读环境变量 CACHE_TTL，回落 config.json cacheTTL
- ?refresh=1 查询参数：GET /api/hot-lists?refresh=1 强制绕过缓存，仅开发用
- 敏感信息不提交（.env 加入 .gitignore）
- 页脚注明：学习项目、非商用
- 不写注释（除非逻辑非显而易见）
- 禁止半成品实现
```

## 8. CSS 与组件设计规则

```
- 参考"今日热榜"的信息密度，清爽易读
- 桌面端 3 列卡片网格（CSS Grid）
- 移动端 @media (max-width: 768px) 切换为 1 列
- 排名 1～3 名视觉强调（金 #FFD700 / 银 #C0C0C0 / 铜 #CD7F32）
- 单卡片失败显示错误文案 + "点击重试"按钮（onRetry 回调），不拖垮整页其他卡片
- HotCard 三态：loading（骨架屏/加载中）、error（message + 重试按钮）、success（数据列表）
- 更新时间显示为相对时间：「更新于 X 分钟前」「更新于 X 小时前」「更新于刚才」
```

## 9. 质量门禁

以下任一项不通过，模块标记为未完成：

| 门禁 | 命令 | 通过标准 |
|---|---|---|
| TypeScript 类型检查 | `npx tsc --noEmit` | 零错误 |
| 单元测试 | `npx vitest run` | 全部 green |
| 测试覆盖（核心路径） | vitest coverage | 核心逻辑 ≥80% |

## 10. 启动指令

现在，按以下步骤开始自主构建：

1. 阅读 `docs/proposal.md`
2. 阅读 `docs/high-level-design.md`
3. 阅读 `docs/low-level-design.md`
4. 阅读 `docs/tasks/progress.md`
5. 找出第一个未完成的 Phase
6. 为该 Phase 中的每个模块生成子 Agent
7. 等待全部子 Agent 返回后验证
8. 更新 progress.md
9. 进入下一 Phase
10. 重复直到全部 Phase 完成

**开始之前，先汇报：当前进度状态、下一个要执行的 Phase、需要生成的子 Agent 数量和名称。然后立即开始执行。**

---

## 附录 A：Vitest 配置参考

### 后端 vitest.config.ts（server 目录）

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
```

### 前端 vitest.config.ts（client 目录）

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

### 前端 test-setup.ts

```ts
import '@testing-library/jest-dom';
```

## 附录 B：tsconfig 路径别名参考

```json
// client/tsconfig.json 和 server/tsconfig.json 均配置
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

前端 Vite 需要额外配置 `resolve.alias`（见 vite.config.ts），后端 tsx 配合 vitest config 中的 alias。

## 附录 C：环境变量参考

```
# 后端 server/.env（不提交到 Git）
WEIBO_API_URL=     # 空值 = 使用内置 Mock 数据
ZHIHU_API_URL=     # 空值 = 使用内置 Mock 数据
BILIBILI_API_URL=  # 空值 = 使用内置 Mock 数据
CACHE_TTL=600      # 缓存 TTL（秒），优先于 config.json
PORT=3001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# 前端 client/.env（不提交到 Git）
VITE_API_BASE=     # 开发环境留空走 Vite proxy，生产环境填后端域名
```
