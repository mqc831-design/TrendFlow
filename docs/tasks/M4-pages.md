# M4 — client/pages 页面层

> 页面级组件，组合 components 和 hooks。

## 子任务

- [ ] **M4-01** 创建 `client/src/pages/HomePage.tsx`
  - 使用 `useHotLists()` 获取数据
  - 使用 `useConfigContext()` 获取当前配置
  - 使用 `useRefresh(onSuccess: refetch)` 管理刷新
  - 用 `useMemo` + `matchKeywords()` 纯函数对所有平台数据执行关键字匹配
  - 工具栏：全局最后更新时间 + `RefreshButton`
  - 数据网格：`.home-page__grid` 容器，3 列卡片（桌面端）
  - 每个平台渲染一个 `HotCard`
  - loading 态 → `<LoadingState />`
  - error 态（整页失败）→ `<ErrorState message={error} />`
  - data==null → `<ErrorState message="无法获取数据" />`
- [ ] **M4-02** 创建 `client/src/pages/ConfigPage.tsx`
  - 从 `useConfigContext()` 读取 loading / error
  - loading 态 → `<LoadingState />`
  - error 态 → `<ErrorState />`
  - 正常态 → `<Link to="/">← 返回首页</Link>` + `<ConfigForm />`

## 产出物

- `client/src/pages/HomePage.tsx`
- `client/src/pages/ConfigPage.tsx`

## 依赖

- M3（HotCard, RefreshButton, LoadingState, ErrorState, ConfigForm）
- M5（useHotLists, useRefresh, useKeywordMatch）
- M6（useConfigContext）
