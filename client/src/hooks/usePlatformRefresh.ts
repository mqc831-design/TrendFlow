import { useState, useCallback } from 'react';
import { triggerPlatformRefresh } from '../api/client';

interface UsePlatformRefreshResult {
  refreshPlatform: (platform: string) => Promise<void>;
  refreshingMap: Record<string, boolean>;
}

function usePlatformRefresh(onSuccess?: () => void): UsePlatformRefreshResult {
  const [refreshingMap, setRefreshingMap] = useState<Record<string, boolean>>({});

  const refreshPlatform = useCallback(async (platform: string) => {
    setRefreshingMap((prev) => ({ ...prev, [platform]: true }));
    try {
      await triggerPlatformRefresh(platform);
      onSuccess?.();
    } finally {
      setRefreshingMap((prev) => ({ ...prev, [platform]: false }));
    }
  }, [onSuccess]);

  return { refreshPlatform, refreshingMap };
}

export { usePlatformRefresh };
export type { UsePlatformRefreshResult };
