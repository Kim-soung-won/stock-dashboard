import { queryOptions } from '@tanstack/react-query';
import { QuoteService } from '@/shared/api/market/quote';
import { toQuoteEntity } from './quote.libs';

export const quoteQueries = {
  all: () => ['market', 'quote'] as const,

  /** 현재가 스냅샷. 이후 갱신은 실시간 틱이 담당하므로 폴링하지 않는다. */
  detail: (code: string) =>
    queryOptions({
      queryKey: [...quoteQueries.all(), code],
      queryFn: async () => toQuoteEntity(await QuoteService.fetchQuote(code)),
      enabled: code.length > 0,
    }),

  orderBook: (code: string) =>
    queryOptions({
      queryKey: [...quoteQueries.all(), code, 'orderBook'],
      queryFn: () => QuoteService.fetchOrderBook(code),
      enabled: code.length > 0,
    }),
};
