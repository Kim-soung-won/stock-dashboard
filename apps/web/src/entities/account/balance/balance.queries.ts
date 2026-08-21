import { queryOptions } from '@tanstack/react-query';
import { BalanceService } from '@/shared/api/account/balance';

export const balanceQueries = {
  all: () => ['account'] as const,

  /**
   * 잔고. 우리 DB 에 사본을 두지 않으므로 이 쿼리가 유일한 출처다.
   * 주문 체결 후에는 이 키를 무효화해 다시 읽는다.
   */
  balance: () =>
    queryOptions({
      queryKey: [...balanceQueries.all(), 'balance'],
      queryFn: () => BalanceService.fetchBalance(),
      staleTime: 10_000,
    }),

  pendingOrders: (code?: string) =>
    queryOptions({
      queryKey: [...balanceQueries.all(), 'pendingOrders', code ?? 'all'],
      queryFn: async () => (await BalanceService.fetchPendingOrders(code)).items,
      staleTime: 5_000,
    }),
};
