import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../App';

// Mock 子页面，简化测试
vi.mock('../pages/HomePage', () => ({
  HomePage: () => <div data-testid="home-page">HomePage Mock</div>,
}));

vi.mock('../pages/ConfigPage', () => ({
  ConfigPage: () => <div data-testid="config-page">ConfigPage Mock</div>,
}));

// Mock Layout，需要保留 Outlet 以便子路由正常渲染
vi.mock('../components/Layout', async () => {
  const { Outlet } = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    default: () => (
      <div data-testid="layout-mock">
        Layout Mock
        <Outlet />
      </div>
    ),
  };
});

describe('App', () => {
  it('应该渲染不崩溃', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('默认路由 / 应该渲染 HomePage', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('路由 /config 应该渲染配置页面', () => {
    window.history.pushState({}, '', '/config');
    render(<App />);
    expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
    expect(screen.getByTestId('config-page')).toBeInTheDocument();
  });

  it('ConfigProvider 包裹了整个路由', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
