import { Platform } from '@shared/types';
import { IAdapter } from './IAdapter.js';
import { WeiboAdapter } from './weibo.adapter.js';
import { ZhihuAdapter } from './zhihu.adapter.js';
import { BilibiliAdapter } from './bilibili.adapter.js';

const adapterRegistry: Map<Platform, IAdapter> = new Map();

function registerAdapter(adapter: IAdapter): void {
  adapterRegistry.set(adapter.platform, adapter);
}

function getAdapter(platform: Platform): IAdapter {
  const adapter = adapterRegistry.get(platform);
  if (!adapter) {
    throw new Error(`适配器未注册: ${platform}`);
  }
  return adapter;
}

function getAllAdapters(): IAdapter[] {
  return Array.from(adapterRegistry.values());
}

export function initAdapters(): void {
  registerAdapter(new WeiboAdapter());
  registerAdapter(new ZhihuAdapter());
  registerAdapter(new BilibiliAdapter());
}

function clearAdapters(): void {
  adapterRegistry.clear();
}

export { getAdapter, getAllAdapters, registerAdapter, clearAdapters };
