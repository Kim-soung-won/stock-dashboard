import { keepPreviousData, queryOptions } from '@tanstack/react-query';
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

  /**
   * 종목명·코드 검색(전 시장 통합). BFF 의 DB 캐시를 질의하므로 유량을 태우지 않는다.
   *
   * 빈 검색어에서는 돌지 않고, 검색어가 바뀌는 동안 이전 결과를 유지해 자동완성 목록이
   * 깜빡이지 않게 한다. 결과는 마스터와 같은 정적 데이터라 오래 캐시한다.
   */
  search: (keyword: string) =>
    queryOptions({
      queryKey: [...symbolQueries.all(), 'search', keyword] as const,
      queryFn: async () => (await SymbolService.searchSymbols(keyword)).items,
      enabled: keyword.trim().length > 0,
      staleTime: 60 * 60_000,
      placeholderData: keepPreviousData,
    }),
};
