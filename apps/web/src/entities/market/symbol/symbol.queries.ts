import { queryOptions } from '@tanstack/react-query';
import type { MarketKind } from '@stock/contracts';
import { SymbolService } from '@/shared/api/market/symbol';

export const symbolQueries = {
  all: () => ['market', 'symbol'] as const,

  /** 종목 마스터는 정적 데이터다. 하루 단위로만 무효화한다. */
  list: (market: MarketKind) =>
    queryOptions({
      queryKey: [...symbolQueries.all(), market],
      queryFn: async () => (await SymbolService.fetchSymbols(market)).items,
      staleTime: 60 * 60_000,
    }),
};
