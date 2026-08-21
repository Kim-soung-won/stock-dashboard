import { queryOptions } from '@tanstack/react-query';
import type { CandleInterval } from '@stock/contracts';
import { ChartService } from '@/shared/api/market/chart';

export const chartQueries = {
  all: () => ['market', 'chart'] as const,

  candles: (code: string, interval: CandleInterval) =>
    queryOptions({
      queryKey: [...chartQueries.all(), code, interval],
      queryFn: async () => (await ChartService.fetchCandles(code, interval)).items,
      enabled: code.length > 0,
      // 과거 봉은 자주 바뀌지 않는다. 장중 갱신은 실시간 틱이 담당한다.
      staleTime: 5 * 60_000,
    }),
};
