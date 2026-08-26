import { queryOptions } from '@tanstack/react-query';
import { WatchlistService } from '@/shared/api/watchlist/item';
import { authStore } from '@/shared/lib';

export const watchlistQueries = {
  all: () => ['watchlist'] as const,

  /** 내 관심종목(코드+이름). 로그인 상태에서만 조회한다. 시세는 별도 실시간으로 붙인다. */
  list: () =>
    queryOptions({
      queryKey: [...watchlistQueries.all(), 'list'] as const,
      queryFn: async () => (await WatchlistService.fetchList()).items,
      enabled: !!authStore.getToken(),
      staleTime: 60_000,
    }),
};
