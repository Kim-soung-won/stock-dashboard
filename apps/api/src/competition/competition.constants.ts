/**
 * 경쟁 규칙 상수 — 한 곳에서만 조정한다.
 *
 * 수수료·세금은 실전 국내 주식과 비슷하게 잡되 시즌 운영자가 쉽게 바꿀 수 있도록
 * 여기 모아둔다. 계산은 전부 원(정수) 단위이고 절사(floor)한다.
 */

/** 모두가 같은 금액으로 시작한다. */
export const STARTING_CASH = 1_000_000;

/** 시즌 기본 기간(일). 시드 시즌 생성에만 쓰인다. */
export const SEASON_DURATION_DAYS = 30;

/** 매수 수수료율 (거래대금 대비). */
export const BUY_FEE_RATE = 0.00015;

/** 매도 수수료율 (거래대금 대비). */
export const SELL_FEE_RATE = 0.00015;

/** 거래세율 — 매도에만 부과 (2025년 기준 0.15%). */
export const SELL_TAX_RATE = 0.0015;

/** 리더보드 브로드캐스트 주기(ms). 시세가 움직인 경우에만 실제로 내보낸다. */
export const LEADERBOARD_BROADCAST_MS = 2_000;

/** 총평가금액 스냅샷 적재 주기(ms). 라인차트용 시계열 — 너무 촘촘하면 저장이 폭증한다. */
export const SNAPSHOT_INTERVAL_MS = 5 * 60_000;

/** 거래대금에 대한 수수료(원, 절사). */
export const feeOf = (amount: number, rate: number): number => Math.floor(amount * rate);

/** 종목코드 정규화 — 거래소 접미사를 떼고 6자리 기준으로 맞춘다(구독·시세 매칭 일관성). */
export const normalizeCode = (code: string): string => {
  const trimmed = code.trim();
  return trimmed.split('_')[0] || trimmed;
};
