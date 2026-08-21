import type { Execution, MarketPhase, MarketStatus, OrderStatus, Tick } from '@stock/contracts';
import { directionOfSignCode, parseAmount, parseHms, parseRate, parseSigned, normalizeStockCode } from '@stock/kiwoom-codes';
import type { RealtimeItem } from './kiwoom-ws.session';

/**
 * 실시간 FID → 도메인 이벤트 변환.
 *
 * FID 번호와 의미는 스펙에서 생성한 `reference/realtime.md` 기준이다.
 * 값은 전부 문자열이고 가격에는 부호가 붙어 있으므로 여기서 정규화한다.
 */

/** `0B` 주식체결 */
export const toTick = (item: RealtimeItem): Tick => {
  const values = item.values;
  return {
    code: normalizeStockCode(item.item),
    price: parseAmount(values['10']), // 10 현재가
    direction: directionOfSignCode(values['25']), // 25 전일대비기호
    change: parseSigned(values['11']), // 11 전일대비
    changeRate: parseRate(values['12']), // 12 등락율
    volume: parseAmount(values['13']), // 13 누적거래량(주)
    at: parseHms(values['20']), // 20 체결시간 HHmmss
  };
};

/** `0B` FID 14 누적거래대금은 백만원 단위다. 원으로 쓰려면 환산해야 한다. */
export const toAccumulatedTradeValueWon = (item: RealtimeItem): number | null => {
  const million = parseAmount(item.values['14']);
  return million === null ? null : million * 1_000_000;
};

/** `00` 주문체결 → 체결 이벤트 */
export const toExecution = (item: RealtimeItem): Execution => {
  const values = item.values;
  return {
    orderNo: (values['9203'] ?? '').trim(), // 9203 주문번호
    code: normalizeStockCode((values['9001'] ?? '').trim()),
    name: (values['302'] ?? '').trim(), // 302 종목명
    side: values['907'] === '1' ? 'sell' : 'buy', // 907 매도수구분 1:매도 2:매수
    filledQuantity: parseAmount(values['911']), // 911 체결량
    filledPrice: parseAmount(values['910']), // 910 체결가
    filledAt: parseHms(values['908']), // 908 주문/체결시간
  };
};

/** `00` 의 913 주문상태(접수/체결/확인/취소/거부) → 도메인 상태 */
export const toOrderStatusFromRealtime = (item: RealtimeItem): OrderStatus => {
  const label = (item.values['913'] ?? '').trim();
  const unfilled = parseAmount(item.values['902']); // 902 미체결수량
  if (label.includes('거부')) return 'rejected';
  if (label.includes('취소')) return 'canceled';
  if (label.includes('체결')) return unfilled && unfilled > 0 ? 'partiallyFilled' : 'filled';
  if (label.includes('접수') || label.includes('확인')) return 'accepted';
  return 'unknown';
};

/**
 * `0s` 장시작시간 FID 215(장운영구분) → 장 상태.
 * 0 장시작전 / 3 장시작 / 2 장마감 알림 / 4·8·9 마감 / c·d 시간외 단일가
 */
const PHASE_BY_CODE: Readonly<Record<string, MarketPhase>> = {
  '0': 'preOpen',
  '3': 'open',
  '2': 'open',
  '4': 'closed',
  '8': 'closed',
  '9': 'closed',
  a: 'afterHours',
  b: 'afterHours',
  c: 'afterHours',
  d: 'closed',
};

export const toMarketStatus = (item: RealtimeItem): MarketStatus => ({
  phase: PHASE_BY_CODE[(item.values['215'] ?? '').trim()] ?? 'unknown',
  at: new Date().toISOString(),
});
