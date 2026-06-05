import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useHotLists } from '../useHotLists';
import type { HotListResponse } from '@shared/types';

// ---- Mock API client ----

const { mockFetchHotLists } = vi.hoisted(() => {
  return { mockFetchHotLists: vi.fn() };
});

vi.mock('../../api/client', () => ({
  fetchHotLists: mockFetchHotLists,
}));

// ---- Mock data ----

const mockResponse: HotListResponse = {
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
          title: '测试热搜',
          url: 'https://weibo.com/123',
          heat: '100万',
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

describe('useHotLists', () => {
  it('初始状态: loading=true, data=null, error=null', () => {
    // 永不 resolve 的 promise 以便观察初始状态
    mockFetchHotLists.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useHotLists());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('成功 fetch: loading 变为 false，data 被填充', async () => {
    mockFetchHotLists.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useHotLists());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
    expect(result.current.data!.data).toHaveLength(1);
    expect(result.current.data!.cache.hit).toBe(true);
    expect(mockFetchHotLists).toHaveBeenCalledTimes(1);
  });

  it('失败 fetch: loading=false, error 被设置', async () => {
    mockFetchHotLists.mockRejectedValueOnce(new Error('网络错误'));

    const { result } = renderHook(() => useHotLists());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('网络错误');
  });

  it('非 Error 实例异常返回默认错误消息', async () => {
    mockFetchHotLists.mockRejectedValueOnce('未知错误字符串');

    const { result } = renderHook(() => useHotLists());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('数据加载失败');
  });

  it('refetch 触发新的 fetch 调用', async () => {
    const secondResponse: HotListResponse = {
      ...mockResponse,
      updatedAt: '2026-06-04T10:05:00.000Z',
      cache: { hit: false, ttl: 0 },
    };

    mockFetchHotLists
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useHotLists());

    // 等待首次加载完成
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual(mockResponse);

    // 调用 refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(mockFetchHotLists).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(secondResponse);
    expect(result.current.loading).toBe(false);
  });
});
