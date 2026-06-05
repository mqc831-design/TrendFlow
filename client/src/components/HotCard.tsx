import { HotItemRow } from './HotItemRow';
import { ErrorState } from './ErrorState';
import { CardSkeleton } from './LoadingState';
import type { HotList, HotItemMatched } from '@shared/types';
import styles from './HotCard.module.css';

interface HotCardProps {
  list: HotList;
  items: HotItemMatched[];
  loading?: boolean;
  onRetry?: () => void;
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return '刚才';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} 分钟前`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} 小时前`;
  const days = Math.floor(diffSeconds / 86400);
  if (days === 1) return '1 天前';
  return `${days} 天前`;
}

function HotCard({ list, items, loading, onRetry }: HotCardProps) {
  const { platformName, updatedAt, error, message } = list;

  const matchedCount = items.filter((i) => i.matched).length;

  if (loading) {
    return (
      <section className={styles['hot-card']}>
        <div className={styles['hot-card__header']}>
          <h2>{platformName}</h2>
        </div>
        <CardSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className={`${styles['hot-card']} ${styles['hot-card--error']}`}>
        <div className={styles['hot-card__header']}>
          <h2>{platformName}</h2>
        </div>
        <ErrorState message={message || '数据获取异常'} inline onRetry={onRetry} />
      </section>
    );
  }

  return (
    <section className={styles['hot-card']}>
      <div className={styles['hot-card__header']}>
        <h2>{platformName}</h2>
        <span className={styles['hot-card__time']}>更新于 {formatRelativeTime(updatedAt)}</span>
        {matchedCount > 0 && (
          <span className={styles['hot-card__match-badge']}>命中关注关键词 {matchedCount} 条</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className={styles['hot-card__empty']}>暂无数据</p>
      ) : (
        <ol className={styles['hot-card__list']}>
          {items.map((item) => (
            <HotItemRow key={`${list.platform}-${item.rank}`} item={item} />
          ))}
        </ol>
      )}
    </section>
  );
}

export { HotCard };
export type { HotCardProps };
