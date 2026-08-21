import { queryOptions } from '@tanstack/react-query';
import type { RankingKind, RankingMarket } from '@stock/contracts';
import { RankingService } from '@/shared/api/market/ranking';

export const rankingQueries = {
  all: () => ['market', 'ranking'] as const,

  /**
   * 순위는 장중에 계속 바뀌지만 폴링하지 않는다(유량). 사용자가 탭을 옮기거나
   * 새로고침할 때 다시 읽고, 그 사이 시세 변화는 실시간 틱이 메운다.
   */
  list: (kind: RankingKind, market: RankingMarket) =>
    queryOptions({
      queryKey: [...rankingQueries.all(), kind, market],
      queryFn: async () => (await RankingService.fetchRanking(kind, market)).items,
      staleTime: 30_000,
    }),
};
