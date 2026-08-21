import { API_ROUTES } from '@stock/contracts';
import { BaseService } from '../../base';
import { QuoteDtoSchemas } from './quote-dto.contracts';
import type { QuoteDtoTypes } from './quote-dto.types';

export const QuoteService = {
  /** 현재가 스냅샷. 실시간 갱신은 WebSocket(0B)이 이어받는다. */
  fetchQuote: (code: string): Promise<QuoteDtoTypes.Quote> =>
    BaseService.get(API_ROUTES.market.quote(code), QuoteDtoSchemas.quote),

  fetchOrderBook: (code: string): Promise<QuoteDtoTypes.OrderBook> =>
    BaseService.get(API_ROUTES.market.orderBook(code), QuoteDtoSchemas.orderBook),
};
