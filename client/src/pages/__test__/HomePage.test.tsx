import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomePage } from '../HomePage';
import type { HotListResponse } from '@shared/types';

// ---- Mock hooks ----
const mockUseHotLists = vi.fn();
const mockUseRefresh = vi.fn();
const mockUseConfigContext = vi.fn();

vi.mock('../../hooks/useHotLists', () => ({
  useHotLists: () => mockUseHotLists(),
}));

vi.mock('../../hooks/useRefresh', () => ({
  useRefresh: () => mockUseRefresh(),
}));

vi.mock('../../context/ConfigContext', () => ({
  useConfigContext: () => mockUseConfigContext(),
}));

// ---- Mock HotCard component ----
vi.mock('../../components/HotCard', () => ({
  HotCard: (props: { list: { platform: string; platformName: string }; items: unknown[] }) => (
    <div data-testid="mock-hotcard" data-platform={props.list.platform}>
      <span>{props.list.platformName}</span>
    </div>
  ),
}));

// ---- Helper: create mock response ----
function createMockResponse(): HotListResponse {
  return {
    updatedAt: '2026-06-04T10:00:00.000Z',
    cache: { hit: true, ttl: 120 },
    data: [
      {
        platform: 'weibo',
        platformName: '微博',
        sourceName: 'weibo-hot',
        updatedAt: '2026-06-04T10:00:00.000Z',
        items: [
          {
            rank: 1,
            title: '测试热搜1',
            url: 'https://weibo.com/1',
            createdAt: '2026-06-04T10:00:00.000Z',
            updatedAt: '2026-06-04T10:00:00.000Z',
          },
        ],
      },
      {
        platform: 'zhihu',
        platformName: '知乎',
        sourceName: 'zhihu-hot',
        updatedAt: '2026-06-04T10:00:00.000Z',
        items: [
          {
            rank: 1,
            title: '知乎热榜1',
            url: 'https://zhihu.com/1',
            createdAt: '2026-06-04T10:00:00.000Z',
            updatedAt: '2026-06-04T10:00:00.000Z',
          },
        ],
      },
      {
        platform: 'bilibili',
        platformName: 'B站',
        sourceName: 'bilibili-hot',
        updatedAt: '2026-06-04T10:00:00.000Z',
        items: [
          {
            rank: 1,
            title: 'B站热榜1',
            url: 'https://bilibili.com/1',
            createdAt: '2026-06-04T10:00:00.000Z',
            updatedAt: '2026-06-04T10:00:00.000Z',
          },
        ],
      },
    ],
  };
}

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

describe('HomePage', () => {
  it('loading 态时应该显示 LoadingState', () => {
    mockUseHotLists.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockUseRefresh.mockReturnValue({
      refreshing: false,
      refresh: vi.fn(),
      error: null,
    });
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(<HomePage />);

    expect(screen.getByText('正在加载热榜数据...')).toBeInTheDocument();
  });

  it('error 态时应该显示 ErrorState', () => {
    mockUseHotLists.mockReturnValue({
      data: null,
      loading: false,
      error: '网络请求失败',
      refetch: vi.fn(),
    });
    mockUseRefresh.mockReturnValue({
      refreshing: false,
      refresh: vi.fn(),
      error: null,
    });
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(<HomePage />);

    expect(screen.getByText('网络请求失败')).toBeInTheDocument();
  });

  it('data 为 null 且无 error 时应显示 fallback 错误提示', () => {
    mockUseHotLists.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseRefresh.mockReturnValue({
      refreshing: false,
      refresh: vi.fn(),
      error: null,
    });
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(<HomePage />);

    expect(screen.getByText('无法获取数据')).toBeInTheDocument();
  });

  it('数据加载成功后应该渲染 HotCard 列表及 grid 容器', () => {
    const mockRefetch = vi.fn();
    const mockRefreshFn = vi.fn();

    mockUseHotLists.mockReturnValue({
      data: createMockResponse(),
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseRefresh.mockReturnValue({
      refreshing: false,
      refresh: mockRefreshFn,
      error: null,
    });
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(<HomePage />);

    const grid = document.querySelector('.home-page__grid');
    expect(grid).toBeInTheDocument();

    const hotCards = screen.getAllByTestId('mock-hotcard');
    expect(hotCards).toHaveLength(3);
  });

  it('刷新按钮应该存在且可点击', () => {
    const mockRefreshFn = vi.fn();

    mockUseHotLists.mockReturnValue({
      data: createMockResponse(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseRefresh.mockReturnValue({
      refreshing: false,
      refresh: mockRefreshFn,
      error: null,
    });
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(<HomePage />);

    const refreshButton = screen.getByText('刷新');
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  it('刷新中时按钮应显示"刷新中..."且被禁用', () => {
    mockUseHotLists.mockReturnValue({
      data: createMockResponse(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseRefresh.mockReturnValue({
      refreshing: true,
      refresh: vi.fn(),
      error: null,
    });
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(<HomePage />);

    const refreshButton = screen.getByText('刷新中...');
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).toBeDisabled();
  });

  it('应该显示全局更新时间', () => {
    mockUseHotLists.mockReturnValue({
      data: createMockResponse(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseRefresh.mockReturnValue({
      refreshing: false,
      refresh: vi.fn(),
      error: null,
    });
    mockUseConfigContext.mockReturnValue({
      config: createDefaultConfig(),
      loading: false,
      error: null,
      updateConfig: vi.fn(),
      reload: vi.fn(),
    });

    render(<HomePage />);

    expect(screen.getByText(/最后更新/)).toBeInTheDocument();
  });
});
