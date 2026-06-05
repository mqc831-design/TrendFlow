import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { ConfigProvider, useConfigContext } from '../ConfigContext';
import { fetchConfig, updateConfig } from '../../api/client';
import type { AppConfig } from '@shared/types';

// ---- Mocks ----

vi.mock('../../api/client', () => ({
  fetchConfig: vi.fn(),
  updateConfig: vi.fn(),
}));

// ---- Fixtures ----

const DEFAULT_CONFIG: AppConfig = {
  keywords: [],
  matchMode: 'any',
  sources: { weibo: true, zhihu: true, bilibili: true },
  topN: 20,
  refreshMode: 'both',
  scheduledTime: '08:00',
  cacheTTL: 600,
};

const REMOTE_CONFIG: AppConfig = {
  keywords: ['热搜', '热门'],
  matchMode: 'all',
  sources: { weibo: true, zhihu: false, bilibili: true },
  topN: 10,
  refreshMode: 'manual',
  scheduledTime: '12:00',
  cacheTTL: 600,
};

const UPDATED_CONFIG: AppConfig = {
  ...REMOTE_CONFIG,
  keywords: ['热搜', '热门', '新词'],
  topN: 30,
};

// ---- Helpers ----

/** 包裹 Provider 的 wrapper，供 renderHook 使用 */
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(ConfigProvider, null, children);
  };
}

/** 测试用的消费者组件，把 context 值渲染到 DOM 中 */
function TestConsumer() {
  const { config, loading, error, updateConfig, reload } = useConfigContext();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? 'null'}</span>
      <span data-testid="keywords">{config.keywords.join(',') || 'empty'}</span>
      <span data-testid="matchMode">{config.matchMode}</span>
      <span data-testid="topN">{config.topN}</span>
      <span data-testid="refreshMode">{config.refreshMode}</span>
      <span data-testid="scheduledTime">{config.scheduledTime}</span>
      <span data-testid="cacheTTL">{config.cacheTTL}</span>
      <button data-testid="update-btn" onClick={() => updateConfig({ topN: 30 })}>
        Update
      </button>
      <button data-testid="reload-btn" onClick={() => reload()}>
        Reload
      </button>
    </div>
  );
}

// ---- Setup ----

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchConfig).mockResolvedValue(REMOTE_CONFIG);
  vi.mocked(updateConfig).mockResolvedValue(UPDATED_CONFIG);
});

// ---- Tests ----

describe('ConfigContext', () => {
  // 1. Provider 初始化后 loading → 最终返回 config
  it('应在挂载后从 loading 状态过渡到返回远程配置', async () => {
    render(
      React.createElement(ConfigProvider, null,
        React.createElement(TestConsumer)
      )
    );

    // 初始状态：loading = true，config 为默认值
    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('keywords').textContent).toBe('empty');

    // 等待异步加载完成后：loading = false，config 为远程值
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('keywords').textContent).toBe('热搜,热门');
    expect(screen.getByTestId('matchMode').textContent).toBe('all');
    expect(screen.getByTestId('topN').textContent).toBe('10');
    expect(screen.getByTestId('error').textContent).toBe('null');
  });

  // 2. fetchConfig 成功 → config 更新为接口返回值
  it('应在 fetchConfig 成功后更新 config 为接口返回值', async () => {
    const { result } = renderHook(() => useConfigContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.config).toEqual(REMOTE_CONFIG);
  });

  // 3. fetchConfig 失败 → error 状态设置
  it('应在 fetchConfig 失败时设置 error 状态', async () => {
    vi.mocked(fetchConfig).mockRejectedValueOnce(new Error('网络错误'));

    render(
      React.createElement(ConfigProvider, null,
        React.createElement(TestConsumer)
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('error').textContent).toBe('网络错误');
    // config 保持默认值
    expect(screen.getByTestId('keywords').textContent).toBe('empty');
  });

  // 4. fetchConfig 失败且非 Error 实例时使用默认错误消息
  it('应在 fetchConfig 抛出非 Error 对象时使用默认错误消息', async () => {
    vi.mocked(fetchConfig).mockRejectedValueOnce('未知异常');

    const { result } = renderHook(() => useConfigContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('配置加载失败');
  });

  // 5. updateConfig 成功 → config 更新
  it('应在 updateConfig 成功后更新 config', async () => {
    const { result } = renderHook(() => useConfigContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateConfig({ topN: 30, keywords: ['热搜', '热门', '新词'] });
    });

    expect(result.current.config).toEqual(UPDATED_CONFIG);
    expect(result.current.error).toBeNull();
    expect(updateConfig).toHaveBeenCalledWith({ topN: 30, keywords: ['热搜', '热门', '新词'] });
  });

  // 6. updateConfig 失败 → error 状态设置 + throw error
  it('应在 updateConfig 失败时设置 error 状态并抛出错误', async () => {
    const updateError = new Error('保存失败');
    vi.mocked(updateConfig).mockRejectedValueOnce(updateError);

    const { result } = renderHook(() => useConfigContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.updateConfig({ topN: 30 })).rejects.toThrow('保存失败');
    });

    expect(result.current.error).toBe('保存失败');
  });

  // 7. updateConfig 失败且非 Error 实例
  it('应在 updateConfig 抛出非 Error 对象时设置默认错误消息', async () => {
    vi.mocked(updateConfig).mockRejectedValueOnce('未知保存错误');

    const { result } = renderHook(() => useConfigContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.updateConfig({ topN: 30 });
      } catch (_) {
        // 预期会抛出
      }
    });

    expect(result.current.error).toBe('配置保存失败');
  });

  // 8. reload 方法重新加载配置
  it('应在调用 reload 时重新加载配置', async () => {
    const firstConfig: AppConfig = { ...REMOTE_CONFIG, keywords: ['初始'] };
    const secondConfig: AppConfig = { ...REMOTE_CONFIG, keywords: ['重载'] };

    vi.mocked(fetchConfig)
      .mockResolvedValueOnce(firstConfig)
      .mockResolvedValueOnce(secondConfig);

    const { result } = renderHook(() => useConfigContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.config.keywords).toEqual(['初始']);

    // 调用 reload
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.config.keywords).toEqual(['重载']);
    expect(fetchConfig).toHaveBeenCalledTimes(2);
  });

  // 9. reload 失败时设置 error
  it('应在 reload 失败时设置 error 状态', async () => {
    const { result } = renderHook(() => useConfigContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    vi.mocked(fetchConfig).mockRejectedValueOnce(new Error('重新加载失败'));

    await act(async () => {
      await result.current.reload();
    });

    // reload 内部 catch 了错误，不会抛出
    expect(result.current.error).toBe('重新加载失败');
  });

  // 10. useConfigContext 在 Provider 外调用 → throw Error
  it('应在 Provider 外部调用 useConfigContext 时抛出错误', () => {
    expect(() => {
      renderHook(() => useConfigContext());
    }).toThrow('useConfigContext 必须在 ConfigProvider 内部使用');
  });

  // 11. children 能正常渲染
  it('应正常渲染子组件', async () => {
    render(
      React.createElement(ConfigProvider, null,
        React.createElement('div', { 'data-testid': 'child' }, 'Hello World')
      )
    );

    expect(screen.getByTestId('child').textContent).toBe('Hello World');

    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  // 12. 初始状态使用 DEFAULT_CONFIG
  it('应在加载前使用 DEFAULT_CONFIG 作为初始值', () => {
    const { result } = renderHook(() => useConfigContext(), {
      wrapper: createWrapper(),
    });

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
