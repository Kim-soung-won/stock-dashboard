import { z } from 'zod';

/**
 * 시세 도메인 계약.
 *
 * 키움의 snake_case·부호 붙은 문자열·필드별 단위는 **BFF 어댑터에서 이미 흡수**했다.
 * 여기서부터는 camelCase + number + 원 단위다.
 */

export const priceDirectionSchema = z.enum(['up', 'down', 'flat', 'upperLimit', 'lowerLimit']);
export type PriceDirection = z.infer<typeof priceDirectionSchema>;

export const marketKindSchema = z.enum(['kospi', 'kosdaq', 'etf', 'unknown']);
export type MarketKind = z.infer<typeof marketKindSchema>;

/** 종목 마스터 1건 (ka10099 종목정보 리스트). */
export const stockSymbolSchema = z.object({
  /** 거래소 접미사를 뗀 6자리 코드 */
  code: z.string(),
  name: z.string(),
  market: marketKindSchema,
  /**
   * 원. 상장주식수 x 전일종가로 파생한 **전일 종가 기준** 시가총액.
   * 키움에 국내 시가총액 TR 이 없어 마스터(ka10099)의 두 필드로 계산한다.
   * 값이 오지 않는 종목(신규 상장 등)은 null.
   */
  marketCap: z.number().nullable(),
});
export type StockSymbol = z.infer<typeof stockSymbolSchema>;

/** 현재가 스냅샷 (ka10001 주식기본정보요청 기반). */
export const quoteSchema = z.object({
  code: z.string(),
  name: z.string(),
  /** 원. 부호 없는 절대값 */
  price: z.number().nullable(),
  direction: priceDirectionSchema,
  /** 전일대비. 부호 있음 */
  change: z.number().nullable(),
  /** 등락률 %. 부호 있음 */
  changeRate: z.number().nullable(),
  open: z.number().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  /** 누적거래량(주) */
  volume: z.number().nullable(),
  /** 누적거래대금(원). 키움은 백만원 단위로 주므로 BFF 에서 환산했다 */
  tradeValue: z.number().nullable(),
  /** BFF 가 스냅샷을 만든 시각 (ISO) */
  at: z.string(),
});
export type Quote = z.infer<typeof quoteSchema>;

/** 봉 1개 (ka10081 일봉 / ka10080 분봉). */
export const candleSchema = z.object({
  /** 일봉은 yyyy-MM-dd, 분봉은 ISO 시각 */
  at: z.string(),
  open: z.number().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  close: z.number().nullable(),
  volume: z.number().nullable(),
});
export type Candle = z.infer<typeof candleSchema>;

export const candleIntervalSchema = z.enum([
  '1m',
  '5m',
  '15m',
  '30m',
  '60m',
  'day',
  'week',
  'month',
  'year',
]);
export type CandleInterval = z.infer<typeof candleIntervalSchema>;

/** 호가 한 단계 */
export const orderBookLevelSchema = z.object({
  price: z.number().nullable(),
  quantity: z.number().nullable(),
});
export type OrderBookLevel = z.infer<typeof orderBookLevelSchema>;

/** 호가창 (ka10004 주식호가요청 / 실시간 0D). */
export const orderBookSchema = z.object({
  code: z.string(),
  /** index 0 이 최우선(1단계) */
  asks: z.array(orderBookLevelSchema),
  bids: z.array(orderBookLevelSchema),
  totalAskQuantity: z.number().nullable(),
  totalBidQuantity: z.number().nullable(),
  at: z.string(),
});
export type OrderBook = z.infer<typeof orderBookSchema>;

/** 장 상태 (실시간 0s 장시작시간). */
export const marketPhaseSchema = z.enum([
  'preOpen',
  'open',
  'closed',
  'afterHours',
  'unknown',
]);
export type MarketPhase = z.infer<typeof marketPhaseSchema>;

export const marketStatusSchema = z.object({
  phase: marketPhaseSchema,
  at: z.string(),
});
export type MarketStatus = z.infer<typeof marketStatusSchema>;
