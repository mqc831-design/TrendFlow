import { useMemo } from 'react';
import type { HotItem, AppConfig, HotItemMatched } from '@shared/types';

function useKeywordMatch(items: HotItem[], config: AppConfig): HotItemMatched[] {
  return useMemo(() => {
    return matchKeywords(items, config);
  }, [items, config]);
}

function matchKeywords(items: HotItem[], config: AppConfig): HotItemMatched[] {
  const { keywords, matchMode } = config;

  if (!keywords.length) {
    return items.map((item) => ({ ...item, matched: false }));
  }

  const lowerKeywords = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);

  const matchedItems = items.map((item) => {
    const titleLower = item.title.toLowerCase();
    const hits = lowerKeywords.filter((kw) => titleLower.includes(kw));

    const isMatch = matchMode === 'all'
      ? hits.length === lowerKeywords.length
      : hits.length > 0;

    if (matchMode === 'exclude' && hits.length > 0) {
      return null as unknown as HotItemMatched;
    }

    let highlightedTitle: string | undefined;
    if (isMatch && matchMode !== 'exclude') {
      highlightedTitle = item.title;
      for (const kw of hits) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        highlightedTitle = highlightedTitle.replace(
          new RegExp(`(${escaped})`, 'gi'),
          '<mark>$1</mark>',
        );
      }
    }

    return { ...item, matched: isMatch, highlightedTitle } as HotItemMatched;
  });

  if (matchMode === 'exclude') {
    return matchedItems.filter(Boolean) as HotItemMatched[];
  }

  return matchedItems as HotItemMatched[];
}

export { useKeywordMatch, matchKeywords };
