# M5 — client/hooks 状态逻辑层

> 封装数据获取、刷新、关键字匹配等状态逻辑为自定义 hook。

## 子任务

- [ ] **M5-01** 创建 `client/src/hooks/useHotLists.ts`
  - `useHotLists()` hook
  - 状态：data, loading, error
  - `useEffect` 首次挂载调 `fetchHotLists()`
  - 提供 `refetch()` 方法重新拉取
  - 返回 `{ data, loading, error, refetch }`
- [ ] **M5-02** 创建 `client/src/hooks/useRefresh.ts`
  - `useRefresh(onSuccess?)` hook
  - 状态：refreshing, lastResult, error
  - `refresh()` 方法调 `triggerRefresh()`，成功后回调 `onSuccess`
  - 返回 `{ refreshing, lastResult, error, refresh }`
- [ ] **M5-03** 创建 `client/src/hooks/useKeywordMatch.ts`
  - `useKeywordMatch(items, config)` hook
  - 内部使用 `useMemo` 做关键字匹配
  - 空关键字 → 不做任何标记
  - `any` 模式 → 命中任一即 matched
  - `all` 模式 → 必须全部命中
  - `exclude` 模式 → 过滤命中条目
  - 生成 `highlightedTitle`（关键字用 `<mark>` 标签包裹，escape 正则特殊字符）
  - 返回 `HotItemMatched[]`

## 产出物

- `client/src/hooks/useHotLists.ts`
- `client/src/hooks/useRefresh.ts`
- `client/src/hooks/useKeywordMatch.ts`

## 依赖

- M1（shared 类型）
- M2（fetchHotLists, triggerRefresh）
