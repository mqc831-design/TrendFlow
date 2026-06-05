import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigForm } from '../ConfigForm';
import type { AppConfig } from '@shared/types';

// ---- Mock CSS ----

vi.mock('../ConfigForm.module.css', () => ({
  default: {
    'config-form': 'config-form',
    'config-fieldset': 'config-fieldset',
    'checkbox-label': 'checkbox-label',
    'config-form__message': 'config-form__message',
  },
}));
vi.mock('../KeywordManager.module.css', () => ({
  default: {
    'keyword-fieldset': 'keyword-fieldset',
    'keyword-input': 'keyword-input',
    'keyword-tags': 'keyword-tags',
    'keyword-tag': 'keyword-tag',
    'hint': 'hint',
  },
}));

// ---- Mock ConfigContext ----

const mockUpdateConfig = vi.fn();
const mockReload = vi.fn();

const mockConfig: AppConfig = {
  keywords: ['热点', '科技'],
  matchMode: 'any',
  sources: { weibo: true, zhihu: true, bilibili: false },
  topN: 20,
  refreshMode: 'both',
  scheduledTime: '08:00',
  cacheTTL: 600,
};

vi.mock('../../context/ConfigContext', () => ({
  useConfigContext: vi.fn(() => ({
    config: mockConfig,
    updateConfig: mockUpdateConfig,
    loading: false,
    error: null,
    reload: mockReload,
  })),
}));

// ================================================================

describe('ConfigForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateConfig.mockResolvedValue(mockConfig);
  });

  // ---- 渲染各配置区域 ----

  it('渲染 KeywordManager（关注关键字区域）', () => {
    render(<ConfigForm />);

    // fieldset legend
    expect(screen.getByText('关注关键字')).toBeInTheDocument();
    // 已有标签
    expect(screen.getByText('热点')).toBeInTheDocument();
    expect(screen.getByText('科技')).toBeInTheDocument();
    // 输入框和添加按钮
    expect(screen.getByPlaceholderText('输入关键字后按回车添加')).toBeInTheDocument();
  });

  it('渲染匹配模式下拉框', () => {
    render(<ConfigForm />);

    const select = screen.getByDisplayValue('任一命中');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('渲染数据源复选框', () => {
    render(<ConfigForm />);

    const weiboCb = screen.getByLabelText('微博') as HTMLInputElement;
    const zhihuCb = screen.getByLabelText('知乎') as HTMLInputElement;
    const biliCb = screen.getByLabelText('B站') as HTMLInputElement;

    expect(weiboCb.checked).toBe(true);
    expect(zhihuCb.checked).toBe(true);
    expect(biliCb.checked).toBe(false);
  });

  it('渲染展示数量下拉框', () => {
    render(<ConfigForm />);

    const select = screen.getByDisplayValue('20 条/平台');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('渲染刷新策略下拉框', () => {
    render(<ConfigForm />);

    const select = screen.getByDisplayValue('手动 + 定时');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  // ---- 修改配置调用 updateConfig ----

  it('修改匹配模式调用 updateConfig', async () => {
    render(<ConfigForm />);

    const select = screen.getByDisplayValue('任一命中');
    fireEvent.change(select, { target: { value: 'all' } });

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith({ matchMode: 'all' });
    });
  });

  it('修改展示数量调用 updateConfig', async () => {
    render(<ConfigForm />);

    const select = screen.getByDisplayValue('20 条/平台');
    fireEvent.change(select, { target: { value: '30' } });

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith({ topN: 30 });
    });
  });

  it('切换数据源调用 updateConfig', async () => {
    render(<ConfigForm />);

    const biliCb = screen.getByLabelText('B站');
    fireEvent.click(biliCb);

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith({
        sources: { weibo: true, zhihu: true, bilibili: true },
      });
    });
  });

  it('修改刷新策略调用 updateConfig', async () => {
    render(<ConfigForm />);

    const select = screen.getByDisplayValue('手动 + 定时');
    fireEvent.change(select, { target: { value: 'manual' } });

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith({ refreshMode: 'manual' });
    });
  });

  // ---- 消息提示 ----

  it('保存成功显示"配置已保存"', async () => {
    mockUpdateConfig.mockResolvedValue({ ...mockConfig, matchMode: 'exclude' });

    render(<ConfigForm />);

    const select = screen.getByDisplayValue('任一命中');
    fireEvent.change(select, { target: { value: 'exclude' } });

    await waitFor(() => {
      expect(screen.getByText('配置已保存')).toBeInTheDocument();
    });
  });

  it('保存失败显示错误提示', async () => {
    mockUpdateConfig.mockRejectedValue(new Error('失败'));

    render(<ConfigForm />);

    const select = screen.getByDisplayValue('任一命中');
    fireEvent.change(select, { target: { value: 'all' } });

    await waitFor(() => {
      expect(screen.getByText('保存失败，请重试')).toBeInTheDocument();
    });
  });
});
