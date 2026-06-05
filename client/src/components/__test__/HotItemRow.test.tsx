import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HotItemRow } from '../HotItemRow';
import type { HotItemMatched } from '@shared/types';

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

function createItem(overrides: Partial<HotItemMatched> = {}): HotItemMatched {
  return {
    rank: 1,
    title: '测试热搜标题',
    url: 'https://example.com',
    createdAt: '2026-06-04T10:00:00.000Z',
    updatedAt: '2026-06-04T10:00:00.000Z',
    ...overrides,
  };
}

// ================================================================

describe('HotItemRow', () => {
  // ---- 基础渲染 ----

  it('渲染排名、标题链接、热度和标签', () => {
    const item = createItem({ heat: '100万', tag: '热' });
    render(<HotItemRow item={item} />);

    // 排名
    expect(screen.getByText('1')).toBeInTheDocument();

    // 标题链接
    const link = screen.getByText('测试热搜标题');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');

    // 热度
    expect(screen.getByText('100万')).toBeInTheDocument();

    // 标签
    expect(screen.getByText('热')).toBeInTheDocument();
  });

  // ---- 排名样式 ----

  it('排名 1 有金色样式 rank--gold', () => {
    const item = createItem({ rank: 1 });
    const { container } = render(<HotItemRow item={item} />);
    const goldEl = container.querySelector('.rank--gold');
    expect(goldEl).toBeInTheDocument();
    expect(goldEl?.textContent).toBe('1');
  });

  it('排名 2 有银色样式 rank--silver', () => {
    const item = createItem({ rank: 2, title: '热搜2' });
    const { container } = render(<HotItemRow item={item} />);
    const silverEl = container.querySelector('.rank--silver');
    expect(silverEl).toBeInTheDocument();
    expect(silverEl?.textContent).toBe('2');
  });

  it('排名 3 有铜色样式 rank--bronze', () => {
    const item = createItem({ rank: 3, title: '热搜3' });
    const { container } = render(<HotItemRow item={item} />);
    const bronzeEl = container.querySelector('.rank--bronze');
    expect(bronzeEl).toBeInTheDocument();
    expect(bronzeEl?.textContent).toBe('3');
  });

  it('排名 4 及以后无特殊样式', () => {
    const item = createItem({ rank: 4, title: '热搜4' });
    const { container } = render(<HotItemRow item={item} />);

    // 排名 span 存在但不含 gold/silver/bronze class
    const rankEl = container.querySelector('.hot-item__rank');
    expect(rankEl).toBeInTheDocument();
    expect(rankEl?.textContent).toBe('4');
    expect(rankEl?.className).not.toContain('rank--gold');
    expect(rankEl?.className).not.toContain('rank--silver');
    expect(rankEl?.className).not.toContain('rank--bronze');
  });

  // ---- summary ----

  it('有 summary 时渲染摘要', () => {
    const item = createItem({ summary: '这是摘要内容', title: '有摘要' });
    render(<HotItemRow item={item} />);
    expect(screen.getByText('这是摘要内容')).toBeInTheDocument();
  });

  it('无 summary 时不渲染摘要元素', () => {
    const item = createItem({ summary: undefined, title: '无摘要' });
    const { container } = render(<HotItemRow item={item} />);
    const summaries = container.querySelectorAll('.hot-item__summary');
    expect(summaries.length).toBe(0);
  });

  // ---- matched / 已关注 ----

  it('matched=true 时显示"已关注"标签', () => {
    const item = createItem({ matched: true });
    render(<HotItemRow item={item} />);
    expect(screen.getByText('已关注')).toBeInTheDocument();
  });

  it('matched=false 时不显示"已关注"标签', () => {
    const item = createItem({ matched: false });
    render(<HotItemRow item={item} />);
    expect(screen.queryByText('已关注')).not.toBeInTheDocument();
  });

  // ---- highlightedTitle ----

  it('highlightedTitle 使用 dangerouslySetInnerHTML 渲染', () => {
    const item = createItem({
      highlightedTitle: '<mark>测试</mark>热搜标题',
      title: '测试热搜标题',
    });
    const { container } = render(<HotItemRow item={item} />);
    const mark = container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent).toBe('测试');
  });

  it('无 highlightedTitle 时渲染原始 title', () => {
    const item = createItem({ highlightedTitle: undefined, title: '普通标题' });
    render(<HotItemRow item={item} />);
    expect(screen.getByText('普通标题')).toBeInTheDocument();
  });

  // ---- heat ----

  it('heat 为 null 时不渲染热度元素', () => {
    const item = createItem({ heat: null, title: '无热度' });
    const { container } = render(<HotItemRow item={item} />);
    const heatEls = container.querySelectorAll('.hot-item__heat');
    expect(heatEls.length).toBe(0);
  });

  // ---- tag ----

  it('tag 为 null 时不渲染标签元素', () => {
    const item = createItem({ tag: null, title: '无标签' });
    const { container } = render(<HotItemRow item={item} />);
    const tagEls = container.querySelectorAll('.hot-item__tag');
    expect(tagEls.length).toBe(0);
  });
});
