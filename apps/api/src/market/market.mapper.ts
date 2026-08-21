import type { Candle, MarketKind, OrderBook, Quote, StockSymbol } from '@stock/contracts';
import {
  applyUnit,
  directionOfSignCode,
  parseAmount,
  parseRate,
  parseSigned,
  parseYmd,
  normalizeStockCode,
} from '@stock/kiwoom-codes';

/**
 * 키움 응답 → 도메인 모델 변환.
 *
 * 이 파일이 "부호가 방향 표시인 가격", "백만원 단위 거래대금", "빈 문자열 = 값 없음"
 * 같은 스펙 함정을 흡수하는 유일한 지점이다. 이 아래(컨트롤러/프론트)로는 정규화된
 * 숫자만 흘러간다.
 */

type Row = Record<string, string | undefined>;

const nowIso = () => new Date().toISOString();

/**
 * ka10099 종목정보 리스트 — 이 TR 은 예외적으로 응답 키가 camelCase 다.
 *
 * `market` 은 응답의 `marketName` 이 아니라 **우리가 요청한 시장**을 넣는다.
 * ka10099 의 시장 구분은 배타적이지 않아서(코스피 목록에 KOSPI 상장 ETF 가 함께 온다)
 * 응답 이름으로 분류하면 "코스피를 물어봤는데 etf/unknown 이 섞여 나오는" 결과가 된다.
 * 목록의 의미는 "그 mrkt_tp 로 조회한 결과"이므로 요청값을 그대로 유지한다.
 */
export const toSymbols = (
  rows: { code?: string; name?: string; marketName?: string }[],
  market: MarketKind,
): StockSymbol[] =>
  rows
    .filter((row): row is { code: string; name: string; marketName?: string } =>
      Boolean(row.code && row.name),
    )
    .map((row) => ({
      code: normalizeStockCode(row.code),
      name: row.name.trim(),
      market,
    }));

/** ka10001 주식기본정보요청 → 현재가 스냅샷 */
export const toQuote = (row: Row): Quote => ({
  code: normalizeStockCode(row['stk_cd'] ?? ''),
  name: (row['stk_nm'] ?? '').trim(),
  // 가격의 부호는 음수가 아니라 전일대비 방향이므로 절대값으로 읽는다.
  price: parseAmount(row['cur_prc']),
  direction: directionOfSignCode(row['pre_sig']),
  change: parseSigned(row['pred_pre']),
  changeRate: parseRate(row['flu_rt']),
  open: parseAmount(row['open_pric']),
  high: parseAmount(row['high_pric']),
  low: parseAmount(row['low_pric']),
  volume: parseAmount(row['trde_qty']),
  // ka10001 에는 거래대금이 없다(trde_pre 는 거래대비). 필요하면 ka10004/실시간 0B(FID 14)로 채운다.
  tradeValue: null,
  at: nowIso(),
});

/** ka10081 주식일봉차트조회요청 → 봉 배열 (오래된 것부터) */
export const toDailyCandles = (rows: Row[]): Candle[] =>
  rows
    .map((row) => ({
      at: parseYmd(row['dt']) ?? '',
      open: parseAmount(row['open_pric']),
      high: parseAmount(row['high_pric']),
      low: parseAmount(row['low_pric']),
      close: parseAmount(row['cur_prc']),
      volume: parseAmount(row['trde_qty']),
    }))
    .filter((candle) => candle.at !== '')
    .sort((a, b) => a.at.localeCompare(b.at));

/**
 * ka10004 주식호가요청 → 호가창.
 *
 * 필드명이 단계마다 다르다: 1단계는 `sel_fpr_bid`(최우선), 2~10단계는
 * `sel_2th_pre_bid` … `sel_10th_pre_bid`. 잔량은 `_req` 접미사.
 */
export const toOrderBook = (code: string, row: Row): OrderBook => {
  const level = (side: 'sel' | 'buy', depth: number) => {
    const priceKey = depth === 1 ? `${side}_fpr_bid` : `${side}_${depth}th_pre_bid`;
    const quantityKey = depth === 1 ? `${side}_fpr_req` : `${side}_${depth}th_pre_req`;
    return { price: parseAmount(row[priceKey]), quantity: parseAmount(row[quantityKey]) };
  };
  const depths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return {
    code: normalizeStockCode(code),
    asks: depths.map((depth) => level('sel', depth)),
    bids: depths.map((depth) => level('buy', depth)),
    totalAskQuantity: parseAmount(row['tot_sel_req']),
    totalBidQuantity: parseAmount(row['tot_buy_req']),
    at: nowIso(),
  };
};

/** 거래대금처럼 백만원 단위로 오는 값 전용. */
export const toWonFromMillion = (raw: string | undefined): number | null =>
  applyUnit(parseAmount(raw), 'millionWon');

/**
 * ka10080 주식분봉차트조회요청 → 봉 배열.
 * 분봉의 시각 필드는 `cntr_tm` 이고 `yyyyMMddHHmmss` 14자리다(일봉의 `dt` 8자리와 다르다).
 */
export const toMinuteCandles = (rows: Row[]): Candle[] =>
  rows
    .map((row) => ({
      at: toIsoFromYmdHms(row['cntr_tm']),
      open: parseAmount(row['open_pric']),
      high: parseAmount(row['high_pric']),
      low: parseAmount(row['low_pric']),
      close: parseAmount(row['cur_prc']),
      volume: parseAmount(row['trde_qty']),
    }))
    .filter((candle) => candle.at !== '')
    .sort((a, b) => a.at.localeCompare(b.at));

const toIsoFromYmdHms = (raw: string | undefined): string => {
  if (!raw || !/^\d{14}$/.test(raw)) return '';
  return (
    raw.slice(0, 4) +
    '-' +
    raw.slice(4, 6) +
    '-' +
    raw.slice(6, 8) +
    'T' +
    raw.slice(8, 10) +
    ':' +
    raw.slice(10, 12) +
    ':' +
    raw.slice(12, 14)
  );
};
