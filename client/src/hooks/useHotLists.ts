import { useState, useEffect, useCallback } from 'react';
import { fetchHotLists } from '../api/client';
import type { HotListResponse } from '@shared/types';

interface UseHotListsResult {
  data: HotListResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useHotLists(): UseHotListsResult {
  const [data, setData] = useState<HotListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHotLists();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

export { useHotLists };
export type { UseHotListsResult };
