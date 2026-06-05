# M6 — client/context 全局状态

> React Context 管理跨页面的应用配置状态。

## 子任务

- [ ] **M6-01** 创建 `client/src/context/ConfigContext.tsx`
  - 定义 `ConfigContextValue` 接口：config, loading, error, updateConfig(), reload()
  - 创建 `ConfigContext`
  - 内置默认配置常量（与后端默认值一致）
  - 定义 `configReducer`（LOAD_START / LOAD_SUCCESS / LOAD_ERROR / UPDATE_SUCCESS / UPDATE_ERROR）
  - 创建 `ConfigProvider` 组件
    - `useReducer` 管理 state
    - `useEffect` 首次挂载调用 `fetchConfig()` 加载配置
    - `load()` 方法 → dispatch + fetchConfig
    - `update(partial)` → dispatch + apiUpdateConfig（失败时 throw 让调用方感知）
  - 创建 `useConfigContext()` hook（含 null 检查）
  - 导出 `ConfigProvider` 和 `useConfigContext`

## 产出物

- `client/src/context/ConfigContext.tsx`

## 依赖

- M1（shared 类型）
- M2（fetchConfig, updateConfig）
