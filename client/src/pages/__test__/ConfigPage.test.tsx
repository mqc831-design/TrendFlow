import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ConfigPage } from '../ConfigPage';

// ---- Mock useConfigContext ----
const mockUseConfigContext = vi.fn();

vi.mock('../../context/ConfigContext', () => ({
  useConfigContext: () => mockUseConfigContext(),
}));

// ---- Mock ConfigForm ----
vi.mock('../../components/ConfigForm', () => ({
  ConfigForm: () => <div data-testid="mock-configform">MockConfigForm</div>,
}));

function createDefaultConfig() {
  return {
    keywords: [],
    matchMode: 'any' as const,
    sources: { weibo: true, zhihu: true, bilibili: true },
    topN: 20 as const,
    refreshMode: 'both' as const,
    scheduledTime: '08:00',
    cacheTTL: 600,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConfigPage', () => {
  it('loading 态时应该显示 LoadingState', () => {
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: true,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ConfigPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('正在加载热榜数据...')).toBeInTheDocument();
  });

  it('error 态时应该显示 ErrorState', () => {
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: '配置加载失败',
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ConfigPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('配置加载失败')).toBeInTheDocument();
  });

  it('正常加载后应该显示 ConfigForm 和返回首页链接', () => {
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ConfigPage />
      </MemoryRouter>,
    );

    const backLink = screen.getByText('← 返回首页');
    expect(backLink).toBeInTheDocument();
    expect(backLink.getAttribute('href')).toBe('/');

    expect(screen.getByTestId('mock-configform')).toBeInTheDocument();
  });

  it('配置页面不应该包含 HomePage 特有的元素', () => {
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ConfigPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText('最后更新')).not.toBeInTheDocument();
    expect(screen.queryByText('刷新')).not.toBeInTheDocument();
    expect(document.querySelector('.home-page__grid')).not.toBeInTheDocument();
  });
});
