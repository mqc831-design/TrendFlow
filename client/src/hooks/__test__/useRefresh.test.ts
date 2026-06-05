import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRefresh } from '../useRefresh';
import type { HotListResponse } from '@shared/types';

// ---- Mock API client ----

const { mockTriggerRefresh } = vi.hoisted(() => {
  return { mockTriggerRefresh: vi.fn() };
});

vi.mock('../../api/client', () => ({
  triggerRefresh: mockTriggerRefresh,
}));

// ---- Mock data ----

const mockResponse: HotListResponse = {
  updatedAt: '2026-06-04T10:00:00.000Z',
  cache: { hit: false, ttl: 0 },
  data: [
    {
      platform: 'weibo',
      platformName: '微博',
      sourceName: 'weibo-hot',
      updatedAt: '2026-06-04T10:00:00.000Z',
      items: [
        {
          rank: 1,
          title: '测试热搜',
          url: 'https://weibo.com/123',
          createdAt: '2026-06-04T10:00:00.000Z',
          updatedAt: '2026-06-04T10:00:00.000Z',
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ================================================================

describe('useRefresh', () => {
  it('初始状态: refreshing=false, lastResult=null, error=null', () => {
    const { result } = renderHook(() => useRefresh());

    expect(result.current.refreshing).toBe(false);
    expect(result.current.lastResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('refresh() 调用 triggerRefresh API 并更新 lastResult', async () => {
    mockTriggerRefresh.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockTriggerRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.lastResult).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
  });

  it('refresh 过程中 refreshing=true，完成后 refreshing=false', async () => {
    let resolvePromise!: (value: HotListResponse) => void;
    const deferred = new Promise<HotListResponse>((resolve) => {
      resolvePromise = resolve;
    });
    mockTriggerRefresh.mockReturnValueOnce(deferred);

    const { result } = renderHook(() => useRefresh());

    let refreshPromise: Promise<void>;
    act(() => {
      refreshPromise = result.current.refresh();
    });

    expect(result.current.refreshing).toBe(true);

    await act(async () => {
      resolvePromise(mockResponse);
      await refreshPromise;
    });

    expect(result.current.refreshing).toBe(false);
    expect(result.current.lastResult).toEqual(mockResponse);
  });

  it('onSuccess 回调被调用并接收响应数据', async () => {
    mockTriggerRefresh.mockResolvedValueOnce(mockResponse);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useRefresh(onSuccess));

    await act(async () => {
      await result.current.refresh();
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(mockResponse);
  });

  it('refresh 失败设置 error', async () => {
    mockTriggerRefresh.mockRejectedValueOnce(new Error('刷新失败: 网络超时'));

    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.refreshing).toBe(false);
    expect(result.current.error).toBe('刷新失败: 网络超时');
    expect(result.current.lastResult).toBeNull();
  });

  it('非 Error 实例异常返回默认错误消息', async () => {
    mockTriggerRefresh.mockRejectedValueOnce('刷新异常');

    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe('刷新失败');
  });

  it('多次调用 refresh 正确处理', async () => {
    const response1 = { ...mockResponse, updatedAt: '2026-06-04T10:01:00.000Z' };
    const response2 = { ...mockResponse, updatedAt: '2026-06-04T10:02:00.000Z' };

    mockTriggerRefresh
      .mockResolvedValueOnce(response1)
      .mockResolvedValueOnce(response2);

    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.lastResult).toEqual(response1);

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.lastResult).toEqual(response2);
  });
});
