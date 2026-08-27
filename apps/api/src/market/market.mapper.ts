import type {
  Candle,
  MarketKind,
  OrderBook,
  Quote,
  RankingItem,
  StockSymbol,
} from '@stock/contracts';
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
  rows: SymbolMasterRow[],
  market: MarketKind,
): StockSymbol[] =>
  rows
    .filter((row): row is SymbolMasterRow & { code: string; name: string } =>
      Boolean(row.code && row.name),
    )
    .map((row) => ({
      code: normalizeStockCode(row.code),
      name: row.name.trim(),
      market,
      marketCap: marketCapOf(row),
    }));

/** ka10099 응답 행. 이 TR 만 예외적으로 camelCase 다. */
export interface SymbolMasterRow {
  code?: string;
  name?: string;
  marketName?: string;
  /** 상장주식수. 0-padding 된 부호 포함 16자리 */
  listCount?: string;
  /** 전일종가(원). 0-padding 된 부호 포함 8자리 */
  lastPrice?: string;
}

/**
 * 시가총액 = 상장주식수 x 전일종가 (원).
 *
 * 키움에 국내 시가총액 순위 TR 이 없어서(미국은 usa20550) 마스터의 두 필드로 파생한다.
 * **전일 종가 기준**이라 장중에 값이 움직이지 않는다 — 순위를 매기는 용도로는 충분하고,
 * 화면에는 기준을 함께 표기한다.
 *
 * 두 값 모두 0-padding 문자열이고 없을 수도 있다(신규 상장·ETF 일부). 한쪽이라도
 * 비면 0 이 아니라 null 이다 — "시가총액 0원"과 "모른다"는 다르다.
 */
export const marketCapOf = (row: Pick<SymbolMasterRow, 'listCount' | 'lastPrice'>): number | null => {
  const shares = parseAmount(row.listCount);
  const close = parseAmount(row.lastPrice);
  if (shares === null || close === null || shares === 0 || close === 0) return null;
  return shares * close;
};

/**
 * 시가총액 순위 — 다른 순위와 달리 키움 TR 이 아니라 **우리 종목 캐시**에서 만든다.
 *
 * 가격은 전일종가다(현재가 TR 이 아니다). 그래서 전일대비·등락률은 null 로 두고,
 * 상위 종목의 현재가는 프론트가 실시간 틱으로 덮는다 — views 순위와 같은 취급이다.
 */
export const toMarketCapRanking = (
  rows: { code: string; name: string; lastPrice: number | null; marketCap: number | null }[],
): RankingItem[] =>
  rows.map((row, index) => ({
    rank: index + 1,
    code: row.code,
    name: row.name,
    price: row.lastPrice,
    direction: 'flat' as const,
    change: null,
    changeRate: null,
    volume: null,
    tradeValue: null,
    rankChange: null,
    marketCap: row.marketCap,
  }));

/**
 * 종목 검색 결과 관련도 정렬 (순수).
 *
 * 이름으로 종목을 고르는 UX 에서는 "삼성" 을 쳤을 때 삼성전자가 맨 위여야 한다. DB 의
 * 부분일치(LIKE)는 순서를 보장하지 않으므로 관련도를 여기서 매긴다 — 완전일치 →
 * 앞부분 일치 → 중간 포함 순이고, 코드 일치를 이름 일치보다 앞에 둔다(코드를 그대로
 * 붙여넣은 사용자는 그 종목을 이미 특정한 것이다).
 *
 * 같은 코드가 여러 시장 목록에 나올 수 있어(코스피 목록에 KOSPI 상장 ETF 가 섞인다)
 * 코드 기준으로 한 건만 남긴다 — 관련도가 가장 높은 쪽을 남긴다.
 */
export const rankSymbolMatches = (
  symbols: StockSymbol[],
  keyword: string,
  limit: number,
): StockSymbol[] => {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return [];

  const best = new Map<string, { symbol: StockSymbol; score: number }>();
  for (const symbol of symbols) {
    const score = matchScore(symbol, needle);
    if (score === null) continue;
    const previous = best.get(symbol.code);
    if (!previous || score < previous.score) best.set(symbol.code, { symbol, score });
  }

  return [...best.values()]
    .sort(
      (a, b) =>
        a.score - b.score ||
        // 같은 관련도면 짧은 이름이 더 정확한 후보다("삼성전자" < "삼성전자우").
        a.symbol.name.length - b.symbol.name.length ||
        a.symbol.name.localeCompare(b.symbol.name, 'ko-KR') ||
        a.symbol.code.localeCompare(b.symbol.code),
    )
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.symbol);
};

/** 관련도 점수(낮을수록 먼저). 어디에도 걸리지 않으면 null = 검색 결과 아님. */
const matchScore = (symbol: StockSymbol, needle: string): number | null => {
  const code = symbol.code.toLowerCase();
  const name = symbol.name.toLowerCase();
  if (code === needle) return 0;
  if (name === needle) return 1;
  if (code.startsWith(needle)) return 2;
  if (name.startsWith(needle)) return 3;
  if (code.includes(needle)) return 4;
  if (name.includes(needle)) return 5;
  return null;
};

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

/**
 * 기간 봉 배열 (오래된 것부터).
 * 일/주/월/연봉(ka10081·ka10082·ka10083·ka10094)은 요청·응답 필드(`dt`·OHLCV)가 모두 같고
 * 응답 배열 키만 다르므로 이 변환 하나를 공유한다. 분봉(ka10080)만 시각 필드가 달라 별도다.
 */
export const toPeriodCandles = (rows: Row[]): Candle[] =>
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
