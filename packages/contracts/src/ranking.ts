import { z } from 'zod';
import { marketKindSchema, priceDirectionSchema } from './market';

/**
 * 순위(인기) 도메인 계약.
 *
 * 키움에는 "인기 종목" TR 이 따로 없고 성격이 다른 순위 TR 여러 개가 있다.
 * 그 차이를 프론트가 알 필요는 없으므로 하나의 모델로 흡수하고, 채워지지 않는 칼럼은
 * null 로 둔다(TR 마다 주는 필드가 다르다).
 */
export const rankingKindSchema = z.enum([
  /** ka00198 실시간종목조회순위 — 사람들이 지금 많이 들여다보는 종목(빅데이터 순위) */
  'views',
  /** ka10030 당일거래량상위 */
  'volume',
  /** ka10032 거래대금상위 */
  'value',
  /** ka10027 전일대비등락률상위 (상승) */
  'gainers',
  /** ka10027 전일대비등락률상위 (하락) */
  'losers',
]);
export type RankingKind = z.infer<typeof rankingKindSchema>;

/** 순위 조회의 시장 필터. `all` 은 전체(코스피+코스닥). */
export const rankingMarketSchema = z.enum(['all', 'kospi', 'kosdaq']);
export type RankingMarket = z.infer<typeof rankingMarketSchema>;

export const rankingItemSchema = z.object({
  rank: z.number(),
  code: z.string(),
  name: z.string(),
  /** 원. 부호 없는 절대값 */
  price: z.number().nullable(),
  direction: priceDirectionSchema,
  change: z.number().nullable(),
  changeRate: z.number().nullable(),
  /** 주. TR 이 주지 않으면 null */
  volume: z.number().nullable(),
  /** 원. 키움이 백만원 단위로 주는 것을 BFF 에서 환산했다 */
  tradeValue: z.number().nullable(),
  /** 순위 변동(+ 상승 / - 하락). views 순위에만 있다 */
  rankChange: z.number().nullable(),
});
export type RankingItem = z.infer<typeof rankingItemSchema>;

/** ka10099 종목 마스터에 시장 구분을 붙인 검색용 항목. */
export const symbolSearchItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  market: marketKindSchema,
});
export type SymbolSearchItem = z.infer<typeof symbolSearchItemSchema>;
