import type { RankingItem, RankingKind } from '@stock/contracts';
import {
  applyUnit,
  directionOfSignCode,
  directionOfValue,
  normalizeStockCode,
  parseAmount,
  parseRate,
  parseSigned,
} from '@stock/kiwoom-codes';

type Row = Record<string, string | undefined>;

/**
 * 거래량 필드에서 관측된 센티넬. `ka10030` 거래량 상위 1위가 `4294967295`
 * (= UINT32 최댓값)로 오는 것을 실측했다 — 실제 수량이 아니라 오버플로 값이다.
 * 화면에 43억주로 찍히면 표를 믿을 수 없게 되므로 "값 없음"으로 떨어뜨린다.
 */
const UINT32_MAX = 4_294_967_295;

const parseCount = (raw: string | undefined): number | null => {
  const value = parseAmount(raw);
  return value === null || value >= UINT32_MAX ? null : value;
};

/**
 * 순위 TR → 공통 RankingItem 변환.
 *
 * TR 마다 순위 필드도 다르고(`bigd_rank` / `now_rank` / 없음) 주는 칼럼도 다르다.
 * 그 차이를 여기서 흡수하고, 없는 값은 0 이 아니라 null 로 둔다 — 화면에서
 * "0원"과 "데이터 없음"이 구분돼야 한다.
 */

/** ka00198 실시간종목조회순위 (인기) */
const toViewsItem = (row: Row, index: number): RankingItem => ({
  rank: parseAmount(row['bigd_rank']) ?? index + 1,
  code: normalizeStockCode(row['stk_cd']),
  name: (row['stk_nm'] ?? '').trim(),
  // 이 TR 은 "기준 시점 주가"를 준다(현재가 TR 이 아니다). 부호는 방향 표시.
  price: parseAmount(row['past_curr_prc']),
  direction: directionOfSignCode(row['base_comp_sign']),
  change: null,
  changeRate: parseRate(row['base_comp_chgr']),
  volume: null,
  tradeValue: null,
  // 순위 변동은 값과 부호가 분리돼 있고, 변동 없으면 빈 문자열이 온다.
  rankChange: signedRankChange(row['rank_chg'], row['rank_chg_sign']),
});

const signedRankChange = (value: string | undefined, sign: string | undefined): number | null => {
  const amount = parseAmount(value);
  if (amount === null || amount === 0) return null;
  return directionOfValue(sign) === 'down' ? -amount : amount;
};

/** ka10030 당일거래량상위 */
const toVolumeItem = (row: Row, index: number): RankingItem => ({
  rank: index + 1,
  code: normalizeStockCode(row['stk_cd']),
  name: (row['stk_nm'] ?? '').trim(),
  price: parseAmount(row['cur_prc']),
  direction: directionOfSignCode(row['pred_pre_sig']),
  change: parseSigned(row['pred_pre']),
  changeRate: parseRate(row['flu_rt']),
  volume: parseCount(row['trde_qty']),
  tradeValue: null,
  rankChange: null,
});

/** ka10032 거래대금상위 */
const toValueItem = (row: Row, index: number): RankingItem => {
  const now = parseAmount(row['now_rank']) ?? index + 1;
  const previous = parseAmount(row['pred_rank']);
  return {
    rank: now,
    code: normalizeStockCode(row['stk_cd']),
    name: (row['stk_nm'] ?? '').trim(),
    price: parseAmount(row['cur_prc']),
    direction: directionOfSignCode(row['pred_pre_sig']),
    change: parseSigned(row['pred_pre']),
    changeRate: parseRate(row['flu_rt']),
    volume: parseCount(row['now_trde_qty']),
    // 거래대금은 백만원 단위로 온다. 원으로 환산해서 넘긴다.
    tradeValue: applyUnit(parseAmount(row['trde_prica']), 'millionWon'),
    // 순위가 올랐으면 양수(전일순위 - 현재순위).
    rankChange: previous === null || previous === 0 ? null : previous - now,
  };
};

/** ka10027 전일대비등락률상위 (상승/하락 공용) */
const toFluctuationItem = (row: Row, index: number): RankingItem => ({
  rank: index + 1,
  code: normalizeStockCode(row['stk_cd']),
  name: (row['stk_nm'] ?? '').trim(),
  price: parseAmount(row['cur_prc']),
  direction: directionOfSignCode(row['pred_pre_sig']),
  change: parseSigned(row['pred_pre']),
  changeRate: parseRate(row['flu_rt']),
  volume: null,
  tradeValue: null,
  rankChange: null,
});

const MAPPER: Readonly<Record<RankingKind, (row: Row, index: number) => RankingItem>> = {
  views: toViewsItem,
  volume: toVolumeItem,
  value: toValueItem,
  gainers: toFluctuationItem,
  losers: toFluctuationItem,
};

export const toRankingItems = (kind: RankingKind, rows: Row[]): RankingItem[] =>
  rows.map((row, index) => MAPPER[kind](row, index)).filter((item) => item.code !== '');
