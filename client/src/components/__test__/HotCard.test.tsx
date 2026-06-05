import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HotCard } from '../HotCard';
import type { HotList, HotItemMatched } from '@shared/types';

// ---- CSS module mocks ----

vi.mock('../HotCard.module.css', () => ({
  default: {
    'hot-card': 'hot-card',
    'hot-card--error': 'hot-card--error',
    'hot-card__header': 'hot-card__header',
    'hot-card__time': 'hot-card__time',
    'hot-card__match-badge': 'hot-card__match-badge',
    'hot-card__empty': 'hot-card__empty',
    'hot-card__list': 'hot-card__list',
  },
}));

vi.mock('../HotItemRow.module.css', () => ({
  default: {
    'hot-item': 'hot-item',
    'hot-item--matched': 'hot-item--matched',
    'hot-item__rank': 'hot-item__rank',
    'rank--gold': 'rank--gold',
    'rank--silver': 'rank--silver',
    'rank--bronze': 'rank--bronze',
    'hot-item__content': 'hot-item__content',
    'hot-item__title': 'hot-item__title',
    'hot-item__summary': 'hot-item__summary',
    'hot-item__meta': 'hot-item__meta',
    'hot-item__heat': 'hot-item__heat',
    'hot-item__tag': 'hot-item__tag',
    'hot-item__followed': 'hot-item__followed',
  },
}));

// ---- Helpers ----

function createList(overrides: Partial<HotList> = {}): HotList {
  return {
    platform: 'weibo',
    platformName: '微博',
    sourceName: 'weibo-hot',
    updatedAt: new Date().toISOString(),
    items: [],
    ...overrides,
  };
}

function createItem(rank: number, overrides: Partial<HotItemMatched> = {}): HotItemMatched {
  return {
    rank,
    title: `热搜标题${rank}`,
    url: `https://example.com/${rank}`,
    createdAt: '2026-06-04T10:00:00.000Z',
    updatedAt: '2026-06-04T10:00:00.000Z',
    ...overrides,
  };
}

// ================================================================

describe('HotCard', () => {
  // ---- 正常渲染 ----

  it('渲染平台名称、条目列表和相对时间', () => {
    const list = createList({ updatedAt: new Date().toISOString() });
    const items: HotItemMatched[] = [
      createItem(1, { title: '条目1' }),
      createItem(2, { title: '条目2' }),
    ];

    render(<HotCard list={list} items={items} />);

    expect(screen.getByText('微博')).toBeInTheDocument();
    expect(screen.getByText('条目1')).toBeInTheDocument();
    expect(screen.getByText('条目2')).toBeInTheDocument();
    expect(screen.getByText(/更新于/)).toBeInTheDocument();
  });

  // ---- Loading 状态 ----

  it('loading=true 时渲染 CardSkeleton', () => {
    const list = createList();
    render(<HotCard list={list} items={[]} loading={true} />);

    // 卡片骨架屏的容器
    const skeleton = document.querySelector('.card-skeleton');
    expect(skeleton).toBeInTheDocument();
    // 平台名称仍应渲染
    expect(screen.getByText('微博')).toBeInTheDocument();
  });

  // ---- Error 状态 ----

  it('list.error=true 时渲染 ErrorState 内联模式', () => {
    const list = createList({
      error: true,
      message: '上游请求失败',
    });

    render(<HotCard list={list} items={[]} />);

    // ErrorState inline 模式（没有 :( 图标）
    expect(screen.getByText('上游请求失败')).toBeInTheDocument();
    // ErrorState inline 的容器 class
    expect(document.querySelector('.error-state--inline')).toBeInTheDocument();
  });

  it('error 状态且提供 onRetry 时渲染重试按钮并响应点击', () => {
    const list = createList({
      error: true,
      message: '请求超时',
    });
    const onRetry = vi.fn();

    render(<HotCard list={list} items={[]} onRetry={onRetry} />);

    const retryBtn = screen.getByText('点击重试');
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('error 状态无 message 时显示默认错误消息', () => {
    const list = createList({ error: true });
    render(<HotCard list={list} items={[]} />);

    expect(screen.getByText('数据获取异常')).toBeInTheDocument();
  });

  // ---- 空数据 ----

  it('空 items 且无 error 时显示"暂无数据"', () => {
    const list = createList();
    render(<HotCard list={list} items={[]} />);

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  // ---- matchedCount badge ----

  it('有 matched 条目时显示匹配数量 badge', () => {
    const list = createList();
    const items: HotItemMatched[] = [
      createItem(1, { matched: true, title: '匹配项1' }),
      createItem(2, { matched: false, title: '非匹配' }),
      createItem(3, { matched: true, title: '匹配项2' }),
    ];

    render(<HotCard list={list} items={items} />);

    expect(screen.getByText('命中关注关键词 2 条')).toBeInTheDocument();
  });

  it('无 matched 条目时不显示 badge', () => {
    const list = createList();
    const items: HotItemMatched[] = [
      createItem(1, { matched: false }),
    ];

    render(<HotCard list={list} items={items} />);

    expect(screen.queryByText(/命中关注关键词/)).not.toBeInTheDocument();
  });

  // ---- 相对时间格式化 ----

  describe('相对时间格式化', () => {
    it('小于 60 秒显示"刚才"', () => {
      const list = createList({
        updatedAt: new Date(Date.now() - 1000).toISOString(),
      });
      render(<HotCard list={list} items={[createItem(1)]} />);

      expect(screen.getByText(/更新于 刚才/)).toBeInTheDocument();
    });

    it('X 分钟前', () => {
      const list = createList({
        updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      });
      render(<HotCard list={list} items={[createItem(1)]} />);

      expect(screen.getByText(/更新于 5 分钟前/)).toBeInTheDocument();
    });

    it('X 小时前', () => {
      const list = createList({
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      });
      render(<HotCard list={list} items={[createItem(1)]} />);

      expect(screen.getByText(/更新于 2 小时前/)).toBeInTheDocument();
    });

    it('1 天前', () => {
      const list = createList({
        updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      });
      render(<HotCard list={list} items={[createItem(1)]} />);

      expect(screen.getByText(/更新于 1 天前/)).toBeInTheDocument();
    });

    it('X 天前', () => {
      const list = createList({
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
      render(<HotCard list={list} items={[createItem(1)]} />);

      expect(screen.getByText(/更新于 3 天前/)).toBeInTheDocument();
    });
  });
});
