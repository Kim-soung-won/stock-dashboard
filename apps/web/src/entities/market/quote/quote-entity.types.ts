import type { QuoteDtoTypes } from '@/shared/api/market/quote';
import type { Tick } from '@stock/contracts';

/**
 * 도메인 모델.
 *
 * 보통 이 계층에서 snake_case DTO 를 camelCase 로 바꾸지만, 이 프로젝트는 BFF 가
 * 이미 정규화했다. 그래서 Entity 는 DTO 와 형태가 같고, 이 계층이 실제로 하는 일은
 * **스냅샷(REST)과 실시간 틱(WebSocket)을 하나의 모델로 합치는 것**이다(quote.libs).
 */
export type QuoteEntity = QuoteDtoTypes.Quote & {
  /** 마지막으로 실시간 틱이 반영된 시각. 없으면 REST 스냅샷 그대로다. */
  tickedAt: string | null;
};

export type OrderBookEntity = QuoteDtoTypes.OrderBook;

export type TickEntity = Tick;
