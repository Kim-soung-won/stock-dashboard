import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AddWatchlistRequest } from '@stock/contracts';
import { WatchlistService } from '@/shared/api/watchlist/item';
import { watchlistQueries } from './watchlist.queries';

/**
 * 관심종목 추가/삭제.
 *
 * 서버가 **갱신된 전체 목록**을 돌려주므로 재조회 없이 캐시를 교체한다(즉시 반영).
 * 자기 슬라이스(watchlist)의 캐시만 건드리므로 여기서 갱신한다 — 다른 슬라이스를
 * 무효화하는 조합은 features 계층의 몫이다.
 */
export const useAddWatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AddWatchlistRequest) => WatchlistService.add(request),
    retry: false,
    onSuccess: (list) =>
      queryClient.setQueryData(watchlistQueries.list().queryKey, list.items),
  });
};

export const useRemoveWatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => WatchlistService.remove(code),
    retry: false,
    onSuccess: (list) =>
      queryClient.setQueryData(watchlistQueries.list().queryKey, list.items),
  });
};
