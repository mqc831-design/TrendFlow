import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingState, CardSkeleton } from '../LoadingState';

// ================================================================

describe('LoadingState', () => {
  it('渲染 spinner 和加载提示文案', () => {
    const { container } = render(<LoadingState />);

    // 加载文案
    expect(screen.getByText('正在加载热榜数据...')).toBeInTheDocument();

    // spinner 元素
    const spinner = container.querySelector('.loading-state__spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('整体容器有 loading-state class', () => {
    const { container } = render(<LoadingState />);
    const root = container.querySelector('.loading-state');
    expect(root).toBeInTheDocument();
  });
});

// ================================================================

describe('CardSkeleton', () => {
  it('渲染 5 行骨架屏', () => {
    const { container } = render(<CardSkeleton />);

    const rows = container.querySelectorAll('.card-skeleton__row');
    expect(rows.length).toBe(5);
  });

  it('每行包含排名占位和文本占位', () => {
    const { container } = render(<CardSkeleton />);

    const firstRow = container.querySelector('.card-skeleton__row');
    expect(firstRow).toBeInTheDocument();

    const rankPlaceholder = firstRow?.querySelector('.card-skeleton__rank');
    expect(rankPlaceholder).toBeInTheDocument();

    const textContainer = firstRow?.querySelector('.card-skeleton__text');
    expect(textContainer).toBeInTheDocument();

    // 长行和短行
    const longLine = textContainer?.querySelector('.card-skeleton__line--long');
    const shortLine = textContainer?.querySelector('.card-skeleton__line--short');
    expect(longLine).toBeInTheDocument();
    expect(shortLine).toBeInTheDocument();
  });

  it('整体容器有 card-skeleton class', () => {
    const { container } = render(<CardSkeleton />);
    const root = container.querySelector('.card-skeleton');
    expect(root).toBeInTheDocument();
  });
});
