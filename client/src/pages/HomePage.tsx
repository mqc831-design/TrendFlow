import { useMemo } from 'react';
import { useHotLists } from '../hooks/useHotLists';
import { useRefresh } from '../hooks/useRefresh';
import { usePlatformRefresh } from '../hooks/usePlatformRefresh';
import { matchKeywords } from '../hooks/useKeywordMatch';
import { useConfigContext } from '../context/ConfigContext';
import { HotCard } from '../components/HotCard';
import { RefreshButton } from '../components/RefreshButton';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import type { HotList, HotItem, AppConfig, HotItemMatched } from '@shared/types';

function HomePage() {
  const { data, loading, error, refetch } = useHotLists();
  const { config } = useConfigContext();
  const { refreshing, refresh } = useRefresh(() => { refetch(); });
  const { refreshPlatform, refreshingMap } = usePlatformRefresh(() => { refetch(); });

  const allMatchedItems = useMemo(() => {
    if (!data) return [];
    return data.data.map((list: HotList) => ({
      list,
      matchedItems: matchKeywords(list.items, config),
    }));
  }, [data, config]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="无法获取数据" />;

  return (
    <div className="home-page">
      <div className="home-page__toolbar">
        <span>最后更新：{new Date(data.updatedAt).toLocaleString('zh-CN')}</span>
        <RefreshButton onClick={refresh} loading={refreshing} />
      </div>

      <div className="home-page__grid">
        {allMatchedItems.map(({ list, matchedItems }) => (
          <HotCard
            key={list.platform}
            list={list}
            items={matchedItems}
            loading={!!refreshingMap[list.platform]}
            onRetry={() => refreshPlatform(list.platform)}
          />
        ))}
      </div>
    </div>
  );
}

export { HomePage };
