import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAddWatch, useRemoveWatch } from './watchlist.mutations';
import { watchlistQueries } from './watchlist.queries';

/**
 * 관심종목 composite 훅.
 *
 * 목록 조회 + 추가/삭제 + 파생 조회(isWatched/toggle)를 한 곳에 모은다. 목록을 한 번만
 * 구독하고 각 행에는 `isWatched`/`toggle` 만 내려주면 되므로, 표의 모든 ★ 가 쿼리를
 * 중복 구독하지 않는다(★ 자체는 순수 표시용 shared/ui StarButton).
 */
export const useWatchlist = () => {
  const list = useQuery(watchlistQueries.list());
  const add = useAddWatch();
  const remove = useRemoveWatch();

  const items = list.data ?? [];
  const codes = useMemo(() => new Set(items.map((item) => item.code)), [items]);

  const toggle = (code: string, name?: string | null): void => {
    if (codes.has(code)) remove.mutate(code);
    else add.mutate({ code, name: name ?? undefined });
  };

  return {
    items,
    codes,
    isWatched: (code: string): boolean => codes.has(code),
    add: (code: string, name?: string | null): void =>
      add.mutate({ code, name: name ?? undefined }),
    remove: (code: string): void => remove.mutate(code),
    toggle,
    isPending: add.isPending || remove.isPending,
    isLoading: list.isLoading,
    error: list.error,
  };
};
