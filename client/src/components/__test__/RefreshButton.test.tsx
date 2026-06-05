import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RefreshButton } from '../RefreshButton';

// ================================================================

describe('RefreshButton', () => {
  it('正常状态: 显示"刷新"且按钮可用', () => {
    const onClick = vi.fn();
    render(<RefreshButton onClick={onClick} loading={false} />);

    const btn = screen.getByRole('button', { name: '刷新' });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('loading 状态: 显示"刷新中..."且按钮禁用', () => {
    const onClick = vi.fn();
    render(<RefreshButton onClick={onClick} loading={true} />);

    const btn = screen.getByRole('button', { name: '刷新中...' });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('点击按钮调用 onClick 回调', () => {
    const onClick = vi.fn();
    render(<RefreshButton onClick={onClick} loading={false} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('loading 时点击不触发回调', () => {
    const onClick = vi.fn();
    render(<RefreshButton onClick={onClick} loading={true} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('className 包含 refresh-btn', () => {
    const { container } = render(<RefreshButton onClick={vi.fn()} loading={false} />);
    const btn = container.querySelector('.refresh-btn');
    expect(btn).toBeInTheDocument();
  });
});
