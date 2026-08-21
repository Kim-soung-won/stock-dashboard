import { queryOptions } from '@tanstack/react-query';
import { OrderService } from '@/shared/api/trading/order';

export const orderQueries = {
  all: () => ['trading', 'order'] as const,

  /** 우리 주문 저널. 키움 조회가 아니라 BFF DB 가 답한다(감사 기록). */
  journal: () =>
    queryOptions({
      queryKey: [...orderQueries.all(), 'journal'],
      queryFn: async () => (await OrderService.fetchOrders()).items,
      staleTime: 5_000,
    }),

  orderability: (code: string, price: number) =>
    queryOptions({
      queryKey: [...orderQueries.all(), 'orderability', code, price],
      queryFn: () => OrderService.fetchOrderability(code, price),
      enabled: code.length >= 6 && price > 0,
      staleTime: 10_000,
    }),
};
