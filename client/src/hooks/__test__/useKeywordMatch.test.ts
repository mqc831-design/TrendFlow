import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeywordMatch, matchKeywords } from '../useKeywordMatch';
import type { HotItem, AppConfig } from '@shared/types';

// ---- Helpers ----

function makeItem(rank: number, title: string): HotItem {
  return {
    rank,
    title,
    url: `https://example.com/${rank}`,
    createdAt: '2026-06-04T10:00:00.000Z',
    updatedAt: '2026-06-04T10:00:00.000Z',
  };
}

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    keywords: [],
    matchMode: 'any',
    sources: { weibo: true, zhihu: true, bilibili: true },
    topN: 20,
    refreshMode: 'both',
    scheduledTime: '08:00',
    cacheTTL: 600,
    ...overrides,
  };
}

// ================================================================
// matchKeywords 纯函数测试
// ================================================================

describe('matchKeywords', () => {
  it('空 keywords 返回所有条目且 matched=false', () => {
    const items = [makeItem(1, '热搜标题'), makeItem(2, '另一个话题')];
    const config = makeConfig({ keywords: [] });

    const result = matchKeywords(items, config);

    expect(result).toHaveLength(2);
    expect(result[0].matched).toBe(false);
    expect(result[0].highlightedTitle).toBeUndefined();
    expect(result[1].matched).toBe(false);
    expect(result[1].highlightedTitle).toBeUndefined();
  });

  it('空 items 返回空数组', () => {
    const config = makeConfig({ keywords: ['热搜'] });
    const result = matchKeywords([], config);
    expect(result).toEqual([]);
  });

  // ---- matchMode: any ----

  it('matchMode="any": 单个关键字命中标记 matched=true', () => {
    const items = [makeItem(1, '人工智能发展'), makeItem(2, '天气预报告诉你')];
    const config = makeConfig({ keywords: ['人工智能'], matchMode: 'any' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(true);
    expect(result[1].matched).toBe(false);
  });

  it('matchMode="any": 多个关键字任一命中即匹配', () => {
    const items = [
      makeItem(1, '热搜话题'),
      makeItem(2, '热门话题'),
      makeItem(3, '娱乐新闻'),
    ];
    const config = makeConfig({ keywords: ['热搜', '热门'], matchMode: 'any' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(true);
    expect(result[1].matched).toBe(true);
    expect(result[2].matched).toBe(false);
  });

  // ---- matchMode: all ----

  it('matchMode="all": 全部关键字命中才匹配', () => {
    const items = [
      makeItem(1, 'AI人工智能和Python技术'),
      makeItem(2, 'AI人工智能发展'),
      makeItem(3, '普通Python编程'),
    ];
    const config = makeConfig({ keywords: ['人工智能', 'Python'], matchMode: 'all' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(true);  // 同时包含两个关键词
    expect(result[1].matched).toBe(false); // 只包含"人工智能"
    expect(result[2].matched).toBe(false); // 只包含"Python"
  });

  it('matchMode="all": 部分命中 matched=false', () => {
    const items = [makeItem(1, 'AI技术前沿')];
    const config = makeConfig({ keywords: ['AI', '区块链'], matchMode: 'all' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(false);
  });

  // ---- matchMode: exclude ----

  it('matchMode="exclude": 命中条目被过滤掉', () => {
    const items = [
      makeItem(1, '广告推广信息'),
      makeItem(2, '正常新闻内容'),
      makeItem(3, '又一个广告'),
    ];
    const config = makeConfig({ keywords: ['广告'], matchMode: 'exclude' });

    const result = matchKeywords(items, config);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('正常新闻内容');
  });

  it('matchMode="exclude": 所有条目命中返回空数组', () => {
    const items = [
      makeItem(1, '广告A'),
      makeItem(2, '广告B'),
    ];
    const config = makeConfig({ keywords: ['广告'], matchMode: 'exclude' });

    const result = matchKeywords(items, config);

    expect(result).toHaveLength(0);
  });

  // ---- 大小写不敏感 ----

  it('大小写不敏感匹配', () => {
    const items = [
      makeItem(1, '学习PYTHON编程'),
      makeItem(2, 'python入门教程'),
      makeItem(3, '其他内容'),
    ];
    const config = makeConfig({ keywords: ['Python'], matchMode: 'any' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(true);
    expect(result[1].matched).toBe(true);
    expect(result[2].matched).toBe(false);
  });

  // ---- highlightedTitle ----

  it('highlightedTitle 包含 <mark> 标签标记匹配关键字', () => {
    const items = [makeItem(1, '人工智能技术突破')];
    const config = makeConfig({ keywords: ['人工智能'], matchMode: 'any' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(true);
    expect(result[0].highlightedTitle).toBe('<mark>人工智能</mark>技术突破');
  });

  it('highlightedTitle 高亮所有匹配关键字（any 模式）', () => {
    const items = [makeItem(1, '人工智能和Python技术')];
    const config = makeConfig({ keywords: ['人工智能', 'Python'], matchMode: 'any' });

    const result = matchKeywords(items, config);

    expect(result[0].highlightedTitle).toContain('<mark>人工智能</mark>');
    expect(result[0].highlightedTitle).toContain('<mark>Python</mark>');
  });

  it('exclude 模式不生成 highlightedTitle', () => {
    const items = [
      makeItem(1, '广告信息'),
      makeItem(2, '正常内容'),
    ];
    const config = makeConfig({ keywords: ['广告'], matchMode: 'exclude' });

    const result = matchKeywords(items, config);

    expect(result).toHaveLength(1);
    expect(result[0].highlightedTitle).toBeUndefined();
  });

  // ---- 正则特殊字符转义 ----

  it('正则特殊字符被正确转义，如 (测试)', () => {
    const items = [
      makeItem(1, '这是(测试)话题'),
      makeItem(2, '这是测试话题'),
    ];
    const config = makeConfig({ keywords: ['(测试)'], matchMode: 'any' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(true);
    expect(result[1].matched).toBe(false);
  });

  // ---- 空白关键字过滤 ----

  it('空白关键字被过滤掉', () => {
    const items = [makeItem(1, '热搜话题')];
    const config = makeConfig({ keywords: ['  ', '热搜', ''], matchMode: 'any' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(true);
  });

  // ---- 边界条件 ----

  it('关键字完全匹配标题开头', () => {
    const items = [makeItem(1, '热搜话题讨论')];
    const config = makeConfig({ keywords: ['热搜'], matchMode: 'any' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(true);
    expect(result[0].highlightedTitle).toBe('<mark>热搜</mark>话题讨论');
  });

  it('关键字完全匹配标题末尾', () => {
    const items = [makeItem(1, '今日热搜')];
    const config = makeConfig({ keywords: ['热搜'], matchMode: 'any' });

    const result = matchKeywords(items, config);

    expect(result[0].matched).toBe(true);
    expect(result[0].highlightedTitle).toBe('今日<mark>热搜</mark>');
  });
});

// ================================================================
// useKeywordMatch Hook 测试
// ================================================================

describe('useKeywordMatch', () => {
  it('通过 useMemo 返回匹配结果', () => {
    const items = [makeItem(1, 'Python教程')];
    const config = makeConfig({ keywords: ['Python'], matchMode: 'any' });

    const { result } = renderHook(() => useKeywordMatch(items, config));

    expect(result.current[0].matched).toBe(true);
    expect(result.current[0].highlightedTitle).toBe('<mark>Python</mark>教程');
  });

  it('config 变化时重新计算', () => {
    const items = [makeItem(1, 'AI智能')];

    const { result, rerender } = renderHook(
      ({ config }) => useKeywordMatch(items, config),
      { initialProps: { config: makeConfig({ keywords: ['AI'], matchMode: 'any' }) } },
    );

    expect(result.current[0].matched).toBe(true);

    rerender({ config: makeConfig({ keywords: [] }) });
    expect(result.current[0].matched).toBe(false);
  });
});
