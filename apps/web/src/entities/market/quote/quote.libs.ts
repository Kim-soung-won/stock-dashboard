import type { Tick } from '@stock/contracts';
import type { QuoteDtoTypes } from '@/shared/api/market/quote';
import type { QuoteEntity } from './quote-entity.types';

export const toQuoteEntity = (dto: QuoteDtoTypes.Quote): QuoteEntity => ({
  ...dto,
  tickedAt: null,
});

/**
 * 실시간 체결(0B)을 스냅샷에 덮어쓴다.
 *
 * 틱에 없는 값(시가·고가·저가 등)은 스냅샷 값을 유지한다. 틱의 필드가 null 이면
 * "값 없음"이므로 덮어쓰지 않는다 — 0 으로 깜빡이는 화면을 막는다.
 */
export const mergeTick = (quote: QuoteEntity, tick: Tick): QuoteEntity => ({
  ...quote,
  price: tick.price ?? quote.price,
  direction: tick.direction,
  change: tick.change ?? quote.change,
  changeRate: tick.changeRate ?? quote.changeRate,
  volume: tick.volume ?? quote.volume,
  tickedAt: tick.at ?? quote.tickedAt,
});
