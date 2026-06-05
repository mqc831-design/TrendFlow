import { useState, useCallback } from 'react';
import { triggerRefresh } from '../api/client';
import type { HotListResponse } from '@shared/types';

interface UseRefreshResult {
  refreshing: boolean;
  lastResult: HotListResponse | null;
  error: string | null;
  refresh: () => Promise<void>;
}

function useRefresh(onSuccess?: (data: HotListResponse) => void): UseRefreshResult {
  const [refreshing, setRefreshing] = useState(false);
  const [lastResult, setLastResult] = useState<HotListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await triggerRefresh();
      setLastResult(result);
      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新失败');
    } finally {
      setRefreshing(false);
    }
  }, [onSuccess]);

  return { refreshing, lastResult, error, refresh };
}

export { useRefresh };
export type { UseRefreshResult };
