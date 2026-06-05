import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KeywordManager } from '../KeywordManager';

vi.mock('../KeywordManager.module.css', () => ({
  default: {
    'keyword-fieldset': 'keyword-fieldset',
    'keyword-input': 'keyword-input',
    'keyword-tags': 'keyword-tags',
    'keyword-tag': 'keyword-tag',
    'hint': 'hint',
  },
}));

// ================================================================

describe('KeywordManager', () => {
  it('渲染输入框和"添加"按钮', () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={[]} onChange={onChange} />);

    expect(screen.getByPlaceholderText('输入关键字后按回车添加')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加' })).toBeInTheDocument();
  });

  it('空 keywords 时显示提示文本', () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={[]} onChange={onChange} />);

    expect(screen.getByText('未设置关键字，首页不做标记')).toBeInTheDocument();
  });

  it('已有关键字以标签形式展示', () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={['热点', '科技']} onChange={onChange} />);

    expect(screen.getByText('热点')).toBeInTheDocument();
    expect(screen.getByText('科技')).toBeInTheDocument();
  });

  it('输入文字并点击"添加"按钮添加关键字', () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={['已有']} onChange={onChange} />);

    const input = screen.getByPlaceholderText('输入关键字后按回车添加');
    fireEvent.change(input, { target: { value: '新关键词' } });
    fireEvent.click(screen.getByRole('button', { name: '添加' }));

    expect(onChange).toHaveBeenCalledWith(['已有', '新关键词']);
  });

  it('按 Enter 添加关键字', () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('输入关键字后按回车添加');
    fireEvent.change(input, { target: { value: '测试' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['测试']);
  });

  it('重复关键字不添加', () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={['热点']} onChange={onChange} />);

    const input = screen.getByPlaceholderText('输入关键字后按回车添加');
    fireEvent.change(input, { target: { value: '热点' } });
    fireEvent.click(screen.getByRole('button', { name: '添加' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('空白输入不添加', () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('输入关键字后按回车添加');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '添加' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('点击 x 按钮删除关键字', () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={['热点', '科技']} onChange={onChange} />);

    // 找到 x 按钮（文本为 × 的按钮）
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons.length).toBe(2);

    // 点击第一个 × 删除"热点"
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['科技']);
  });

  it('点击另一个 x 按钮删除对应关键字', () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={['热点', '科技']} onChange={onChange} />);

    const removeButtons = screen.getAllByText('×');
    // 点击第二个 × 删除"科技"
    fireEvent.click(removeButtons[1]);
    expect(onChange).toHaveBeenCalledWith(['热点']);
  });
});
