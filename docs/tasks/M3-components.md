# M3 — client/components 组件层

> 可复用 UI 组件，每个组件一个 `.tsx` + 对应 `.module.css`。

## 子任务

- [ ] **M3-01** 创建 `Layout` 组件（`Layout.tsx` + `Layout.module.css`）
  - **使用 default export**
  - 页头：网站名称「迷你今日热榜」+ 副标题「聚合微博、知乎、B站今日热榜」
  - 主体：`<Outlet />`（react-router-dom 子路由出口）
  - 页脚：「本网站仅用于学习研究，非商业用途」+ 数据来源说明
- [ ] **M3-02** 创建 `HotItemRow` 组件（`HotItemRow.tsx` + `HotItemRow.module.css`）
  - Props: `item: HotItemMatched`
  - 排名徽章：1～3 名视觉强调（金 #FFD700 / 银 #C0C0C0 / 铜 #CD7F32），4+ 默认样式
  - 标题：`<a target="_blank" rel="noopener noreferrer">`，有 `highlightedTitle` 时用 `dangerouslySetInnerHTML`
  - 摘要：有值时显示 `item.summary`
  - Meta 区：热度值（无值隐藏）、标签（无值隐藏）、已关注标记（matched 时显示）
  - 热度值显示格式化后的 heat；无 heat 时整个热度元素隐藏（不显示"暂无热度"文字）
- [ ] **M3-03** 创建 `HotCard` 组件（`HotCard.tsx` + `HotCard.module.css`）
  - Props: `{ list: HotList; items: HotItemMatched[]; loading?: boolean; onRetry?: () => void }`
  - **三态设计**：
    - `loading` → 骨架屏或「加载中...」文案
    - `list.error` → 显示 `ErrorState`（inline） + 「点击重试」按钮（调用 `onRetry`）
    - 正常 → 现有列表渲染
  - 头部：平台名称
  - **更新时间**：用相对时间显示——「更新于 X 分钟前」「更新于 X 小时前」「更新于 1 天前」「更新于刚才」（60 秒内）。缓存期内该时间不变是正常现象
  - 命中关键字计数 badge（matchedCount > 0 时显示）
  - 空列表 + 非 error → 显示「暂无数据」
  - 有数据时渲染 `<ol>` + `HotItemRow` 列表
- [ ] **M3-04** 创建 `RefreshButton` 组件（`RefreshButton.tsx`）
  - Props: `onClick`, `loading`
  - loading 时 disabled + 文案「刷新中...」
  - 正常时文案「刷新」
- [ ] **M3-05** 创建 `LoadingState` 组件（`LoadingState.tsx` + CSS）
  - 旋转加载动画 + 「正在加载热榜数据...」文案
  - 同时导出 `CardSkeleton`（用于卡片级 loading 骨架屏）：简单的占位块 + 脉冲动画
- [ ] **M3-06** 创建 `ErrorState` 组件（`ErrorState.tsx` + CSS）
  - Props: `{ message: string; inline?: boolean; onRetry?: () => void }`
  - inline=true → 紧凑提示（卡片内用），有 `onRetry` 时显示重试按钮
  - inline=false → 整页错误展示（图标 + 文案 + 可选重试按钮）
- [ ] **M3-07** 创建 `KeywordManager` 组件（`KeywordManager.tsx` + `KeywordManager.module.css`）
  - Props: `keywords: string[]`, `onChange: (keywords: string[]) => void`
  - 输入框 + 「添加」按钮
  - 回车添加关键字（去重、去空）
  - 已添加关键字以 tag 形式展示（含 × 删除按钮）
  - 空列表时显示提示文案
- [ ] **M3-08** 创建 `ConfigForm` 组件（`ConfigForm.tsx` + `ConfigForm.module.css`）
  - 从 `useConfigContext()` 读取 config
  - 关键字区域：渲染 `KeywordManager`
  - 匹配模式：`<select>`（任一命中 / 全部命中 / 排除关键字）
  - 数据源开关：微博/知乎/B站 三个 checkbox
  - 展示数量：`<select>`（10/20/30）
  - 刷新策略：`<select>`（manual/scheduled/both）
  - 各项 onChange 直接调 `updateConfig`（即时生效）
  - 保存状态提示（成功/失败 message）
  - **测试注意**：ConfigForm 内部调 `useConfigContext()`，测试需 `vi.mock('../../context/ConfigContext', () => ({ useConfigContext: vi.fn() }))`

## 产出物

- `client/src/components/Layout.tsx` + `Layout.module.css`
- `client/src/components/HotItemRow.tsx` + `HotItemRow.module.css`
- `client/src/components/HotCard.tsx` + `HotCard.module.css`
- `client/src/components/RefreshButton.tsx`
- `client/src/components/LoadingState.tsx`（含 CardSkeleton）
- `client/src/components/ErrorState.tsx`
- `client/src/components/KeywordManager.tsx` + `KeywordManager.module.css`
- `client/src/components/ConfigForm.tsx` + `ConfigForm.module.css`

## 依赖

- M1（shared 类型）
- M6（useConfigContext — 仅 ConfigForm 用到）
