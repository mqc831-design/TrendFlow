import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Layout from '../Layout';
import { ConfigProvider } from '../../context/ConfigContext';

vi.mock('../Layout.module.css', () => ({
  default: {
    'app-layout': 'app-layout',
    'app-header': 'app-header',
    'app-subtitle': 'app-subtitle',
    'app-main': 'app-main',
    'app-footer': 'app-footer',
  },
}));

vi.mock('../../api/client', () => ({
  fetchConfig: vi.fn().mockResolvedValue({
    keywords: [],
    matchMode: 'any',
    sources: { weibo: true, zhihu: true, bilibili: true },
    topN: 20,
    refreshMode: 'both',
    scheduledTime: '08:00',
    cacheTTL: 600,
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ConfigProvider>
      <MemoryRouter initialEntries={['/']}>
        {ui}
      </MemoryRouter>
    </ConfigProvider>,
  );
}

// ================================================================

describe('Layout', () => {
  it('渲染 header 包含网站名称"迷你今日热榜"', async () => {
    renderWithProviders(<Layout />);

    expect(await screen.findByText('迷你今日热榜')).toBeInTheDocument();
    expect(screen.getByText('聚合微博、知乎、B站今日热榜')).toBeInTheDocument();
  });

  it('渲染 footer 包含合规文案和更新频率', async () => {
    renderWithProviders(<Layout />);

    expect(await screen.findByText('本站为个人学习项目，非商业用途')).toBeInTheDocument();
    expect(screen.getByText('数据来源：微博、知乎、B站公开热榜接口，非官方数据')).toBeInTheDocument();
    expect(screen.getByText('更新频率约 10 分钟（缓存 TTL）')).toBeInTheDocument();
    expect(screen.getByText('如有侵权或违规内容，请联系：contact@example.com')).toBeInTheDocument();
  });

  it('渲染 Outlet（<main> 元素承载子内容）', async () => {
    renderWithProviders(<Layout />);

    await screen.findByText('迷你今日热榜');
    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  it('整体布局用 CSS module class 包裹', async () => {
    const { container } = renderWithProviders(<Layout />);

    await screen.findByText('迷你今日热榜');
    const root = container.querySelector('.app-layout');
    expect(root).toBeInTheDocument();
  });

  it('header 包含 h1 标签', async () => {
    renderWithProviders(<Layout />);

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('迷你今日热榜');
  });
});
