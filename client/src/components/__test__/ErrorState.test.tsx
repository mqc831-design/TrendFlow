import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from '../ErrorState';

// ================================================================

describe('ErrorState', () => {
  // ---- 默认模式 (inline=false) ----

  it('inline=false（默认）时显示完整错误信息及图标', () => {
    render(<ErrorState message="服务端异常" />);

    // 图标存在
    expect(screen.getByText(':(')).toBeInTheDocument();
    // 错误消息
    expect(screen.getByText('服务端异常')).toBeInTheDocument();
  });

  // ---- inline 模式 ----

  it('inline=true 时显示紧凑错误', () => {
    render(<ErrorState message="网络超时" inline />);

    // 紧凑模式下不包含图标 (:( 字样)
    expect(screen.queryByText(':(')).not.toBeInTheDocument();
    // 错误消息仍渲染
    expect(screen.getByText('网络超时')).toBeInTheDocument();
  });

  // ---- inline 模式差异验证 ----

  it('inline 模式使用不同的 CSS class', () => {
    const { container: fullContainer } = render(<ErrorState message="错误A" />);
    const { container: inlineContainer } = render(<ErrorState message="错误B" inline />);

    // 全页模式: error-state
    const fullRoot = fullContainer.querySelector('.error-state');
    expect(fullRoot).toBeInTheDocument();
    expect(fullRoot?.className).not.toContain('error-state--inline');

    // 紧凑模式: error-state error-state--inline
    const inlineRoot = inlineContainer.querySelector('.error-state');
    expect(inlineRoot).toBeInTheDocument();
    expect(inlineRoot?.className).toContain('error-state--inline');
  });

  // ---- onRetry ----

  it('提供 onRetry 时显示重试按钮', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="出错了" onRetry={onRetry} />);

    const retryBtn = screen.getByText('重试');
    expect(retryBtn).toBeInTheDocument();
  });

  it('inline 模式且提供 onRetry 时显示"点击重试"按钮', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="超时" inline onRetry={onRetry} />);

    const retryBtn = screen.getByText('点击重试');
    expect(retryBtn).toBeInTheDocument();
  });

  it('点击重试按钮调用 onRetry 回调', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="出错" onRetry={onRetry} />);

    fireEvent.click(screen.getByText('重试'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('点击"点击重试"按钮调用 onRetry 回调', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="超时" inline onRetry={onRetry} />);

    fireEvent.click(screen.getByText('点击重试'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // ---- 无 onRetry ----

  it('不提供 onRetry 时不渲染重试按钮', () => {
    render(<ErrorState message="错误" />);

    expect(screen.queryByText('重试')).not.toBeInTheDocument();
    expect(screen.queryByText('点击重试')).not.toBeInTheDocument();
  });

  it('inline 模式且不提供 onRetry 时不渲染重试按钮', () => {
    render(<ErrorState message="错误" inline />);

    expect(screen.queryByText('点击重试')).not.toBeInTheDocument();
  });
});
