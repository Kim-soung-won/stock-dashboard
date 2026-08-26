import { queryOptions } from '@tanstack/react-query';
import { PortfolioService } from '@/shared/api/competition/portfolio';

export const portfolioQueries = {
  all: () => ['competition', 'portfolio'] as const,

  /**
   * 내 포트폴리오. 현재가 평가는 서버가 pricebook(WS 틱)으로 계산한다. 매매 후에는
   * 이 키를 무효화해 다시 읽는다. 실시간 순위(WS)가 갱신될 때 함께 무효화해 내 평가도
   * 최신으로 유지한다.
   */
  current: () =>
    queryOptions({
      queryKey: [...portfolioQueries.all(), 'current'],
      queryFn: () => PortfolioService.fetchPortfolio(),
      staleTime: 5_000,
    }),

  trades: () =>
    queryOptions({
      queryKey: [...portfolioQueries.all(), 'trades'],
      queryFn: async () => (await PortfolioService.fetchTrades()).items,
      staleTime: 5_000,
    }),
};
