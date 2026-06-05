import type { HotItemMatched } from '@shared/types';
import styles from './HotItemRow.module.css';

interface HotItemRowProps {
  item: HotItemMatched;
}

function getRankClass(rank: number): string {
  if (rank === 1) return styles['rank--gold'];
  if (rank === 2) return styles['rank--silver'];
  if (rank === 3) return styles['rank--bronze'];
  return '';
}

function HotItemRow({ item }: HotItemRowProps) {
  const { rank, title, url, heat, summary, tag, matched, highlightedTitle } = item;

  return (
    <li className={`${styles['hot-item']}${matched ? ` ${styles['hot-item--matched']}` : ''}`}>
      <span className={`${styles['hot-item__rank']} ${getRankClass(rank)}`}>{rank}</span>
      <div className={styles['hot-item__content']}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles['hot-item__title']}
          dangerouslySetInnerHTML={highlightedTitle ? { __html: highlightedTitle } : undefined}
        >
          {highlightedTitle ? undefined : title}
        </a>
        {summary && <p className={styles['hot-item__summary']}>{summary}</p>}
        <div className={styles['hot-item__meta']}>
          {heat && <span className={styles['hot-item__heat']}>{heat}</span>}
          {tag && <span className={styles['hot-item__tag']}>{tag}</span>}
          {matched && <span className={styles['hot-item__followed']}>已关注</span>}
        </div>
      </div>
    </li>
  );
}

export { HotItemRow };
export type { HotItemRowProps };
