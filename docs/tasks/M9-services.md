# M9 — server/services 业务服务层

> 缓存管理、配置管理、定时调度。

## 子任务

- [ ] **M9-01** 创建 `server/src/services/cacheService.ts`
  - `CacheService` 类：`Map<Platform, CacheEntry>` 内存存储
  - `get(platform)` — 返回原始缓存数据（不检查 TTL）
  - `set(platform, data)` — 写入缓存 + 时间戳
  - `isValid(platform)` — 检查缓存是否在 TTL 内
  - **TTL 读取优先级**：环境变量 `CACHE_TTL` → config.json `cacheTTL` → 默认 600 秒
  - `getOrFetch(platform)` — TTL 有效返回缓存（打印 `[cache hit] platform`），无效则调 adapter 拉取（打印 `[cache miss] platform`）
  - `getOrFetch(platform, forceRefresh)` — 新增第二个参数 `forceRefresh?: boolean`，为 true 时跳过 TTL 检查直接拉取
  - 拉取失败 → 回退旧缓存（标记 error=true）→ 无旧缓存返回空占位
  - `getOrFetchAll(platforms, forceRefresh?)` — Promise.all 批量获取
  - `refreshAll(platforms)` — Promise.allSettled 强制刷新全部
  - 部分失败保留旧缓存 + error 标记
  - 导出单例 `cacheService`
- [ ] **M9-02** 创建 `server/src/services/configService.ts`
  - `ConfigService` 类：内存缓存 + JSON 文件持久化
  - 配置文件路径：`server/config.json`
  - 默认配置：keywords=[], matchMode=any, sources 全开, topN=20, refreshMode=both, scheduledTime="08:00", cacheTTL=600
  - `loadFromFile()` — 读文件，不存在则自动创建默认配置；JSON 损坏 → 返回默认配置
  - `writeToFile(config)` — 写文件（含目录自动创建）
  - `get()` — 返回当前配置副本
  - `update(partial)` — 合并 + 写文件 + 更新内存 → 返回新配置
  - `reset()` — 恢复默认配置
  - 导出单例 `configService`
- [ ] **M9-03** 创建 `server/src/services/schedulerService.ts`
  - `SchedulerService` 类：封装 node-cron 定时任务
  - `start()` — 读取 `refreshMode`，manual 则跳过；scheduled/both 则注册 cron
  - 解析 `scheduledTime`（如 "08:00"）为 cron 表达式
  - 触发时调用 `cacheService.refreshAll()` + console.log 记录
  - `stop()` — 停止 cron 任务
  - `restart()` — stop + start（配置变更后调用）
  - 导出单例 `schedulerService`

## 产出物

- `server/src/services/cacheService.ts`
- `server/src/services/configService.ts`
- `server/src/services/schedulerService.ts`

## 依赖

- M1（shared 类型）
- M8（adapterFactory.getAdapter）
