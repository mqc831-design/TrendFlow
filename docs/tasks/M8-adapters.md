# M8 — server/adapters 适配器层

> 各平台数据源适配器，调用上游 JSON 接口并清洗为标准 HotList。

## 子任务

- [ ] **M8-01** 创建 `server/src/adapters/IAdapter.ts`
  - 定义 `IAdapter` 接口：`platform`, `platformName`, `sourceName`, `fetchHotList(): Promise<HotList>`
- [ ] **M8-02** 创建 `server/src/adapters/weibo.adapter.ts`
  - 实现 `WeiboAdapter` 类（implements IAdapter）
  - API URL 从 `WEIBO_API_URL` 环境变量读取
  - 5 秒 AbortController 超时
  - 字段映射：rank→rank, word→title, url→url, num→heat, tag→tag
  - 失败抛出 `AppError(502, 'UPSTREAM_ERROR', ...)`
- [ ] **M8-03** 创建 `server/src/adapters/zhihu.adapter.ts`
  - 实现 `ZhihuAdapter` 类（implements IAdapter）
  - API URL 从 `ZHIHU_API_URL` 环境变量读取
  - 5 秒 AbortController 超时
  - 字段映射：target.title→title, target.url→url, detail_text→heat, target.excerpt→summary
  - rank 缺失时用 index+1 回退；title 缺失用 "(无标题)"
  - 失败抛出 `AppError(502, 'UPSTREAM_ERROR', ...)`
- [ ] **M8-04** 创建 `server/src/adapters/bilibili.adapter.ts`
  - 实现 `BilibiliAdapter` 类（implements IAdapter）
  - API URL 从 `BILIBILI_API_URL` 环境变量读取
  - 5 秒 AbortController 超时
  - 字段映射：title→title, bvid→url（拼接 `bilibili.com/video/`）, play→heat（格式化为 "X 万播放"）
  - 失败抛出 `AppError(502, 'UPSTREAM_ERROR', ...)`
- [ ] **M8-05** 创建 `server/src/adapters/adapterFactory.ts`
  - `adapterRegistry: Map<Platform, IAdapter>`
  - `registerAdapter(adapter)` — 注册适配器
  - `getAdapter(platform)` — 获取适配器，未注册时抛错
  - `getAllAdapters()` — 获取全部注册的适配器
  - `initAdapters()` — 注册全部 3 个适配器（Weibo/Zhihu/Bilibili）

## 产出物

- `server/src/adapters/IAdapter.ts`
- `server/src/adapters/weibo.adapter.ts`
- `server/src/adapters/zhihu.adapter.ts`
- `server/src/adapters/bilibili.adapter.ts`
- `server/src/adapters/adapterFactory.ts`

## 依赖

- M1（shared 类型）
- M10（AppError）
