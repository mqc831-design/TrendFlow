import { describe, it, expect, beforeEach } from 'vitest';
import { IAdapter } from '../IAdapter.js';
import { WeiboAdapter } from '../weibo.adapter.js';
import { ZhihuAdapter } from '../zhihu.adapter.js';
import { BilibiliAdapter } from '../bilibili.adapter.js';
import {
  getAdapter,
  getAllAdapters,
  registerAdapter,
  initAdapters,
  clearAdapters,
} from '../adapterFactory.js';

describe('adapterFactory', () => {
  // 每个测试前清空注册表，避免模块级状态污染
  beforeEach(() => {
    clearAdapters();
  });

  it('registerAdapter 应该能注册适配器', () => {
    const adapter = new WeiboAdapter();
    registerAdapter(adapter);
    const retrieved = getAdapter('weibo');
    expect(retrieved).toBe(adapter);
    expect(retrieved.platform).toBe('weibo');
    expect(retrieved.platformName).toBe('微博');
  });

  it('getAdapter 应该能获取已注册的适配器', () => {
    const weiboAdapter = new WeiboAdapter();
    registerAdapter(weiboAdapter);
    const result = getAdapter('weibo');
    expect(result).toBe(weiboAdapter);
  });

  it('getAdapter 在未注册时应抛出错误', () => {
    expect(() => getAdapter('zhihu')).toThrow('适配器未注册: zhihu');
  });

  it('getAllAdapters 应该返回所有已注册的适配器', () => {
    const weibo = new WeiboAdapter();
    const zhihu = new ZhihuAdapter();
    registerAdapter(weibo);
    registerAdapter(zhihu);

    const all = getAllAdapters();
    expect(all).toHaveLength(2);
    expect(all).toContain(weibo);
    expect(all).toContain(zhihu);
  });

  it('getAllAdapters 在空注册表时应该返回空数组', () => {
    const all = getAllAdapters();
    expect(all).toHaveLength(0);
  });

  it('initAdapters 应该注册全部 3 个适配器', () => {
    initAdapters();
    const weibo = getAdapter('weibo');
    const zhihu = getAdapter('zhihu');
    const bilibili = getAdapter('bilibili');

    expect(weibo).toBeInstanceOf(WeiboAdapter);
    expect(weibo.platform).toBe('weibo');
    expect(weibo.platformName).toBe('微博');

    expect(zhihu).toBeInstanceOf(ZhihuAdapter);
    expect(zhihu.platform).toBe('zhihu');
    expect(zhihu.platformName).toBe('知乎');

    expect(bilibili).toBeInstanceOf(BilibiliAdapter);
    expect(bilibili.platform).toBe('bilibili');
    expect(bilibili.platformName).toBe('B站');
  });

  it('initAdapters 后 getAllAdapters 应该返回 3 个适配器', () => {
    initAdapters();
    const all = getAllAdapters();
    expect(all).toHaveLength(3);

    const platforms = all.map((a) => a.platform);
    expect(platforms).toContain('weibo');
    expect(platforms).toContain('zhihu');
    expect(platforms).toContain('bilibili');
  });

  it('registerAdapter 覆盖同名平台时应该替换旧适配器', () => {
    const oldAdapter = new WeiboAdapter();
    registerAdapter(oldAdapter);

    const newAdapter = new WeiboAdapter();
    registerAdapter(newAdapter);

    const retrieved = getAdapter('weibo');
    expect(retrieved).toBe(newAdapter);
    expect(retrieved).not.toBe(oldAdapter);
  });

  it('每个已注册适配器都应该实现 IAdapter 接口', () => {
    const adapter = new WeiboAdapter();
    registerAdapter(adapter);
    const retrieved = getAdapter('weibo');

    expect(retrieved.platform).toBeDefined();
    expect(retrieved.platformName).toBeDefined();
    expect(retrieved.sourceName).toBeDefined();
    expect(typeof retrieved.fetchHotList).toBe('function');
  });
});
