import type { Balance, OrderSide, OrderStatus, PendingOrder, Position } from '@stock/contracts';
import { directionOfSignCode, parseAmount, parseHms, parseRate, parseSigned, normalizeStockCode } from '@stock/kiwoom-codes';

type Row = Record<string, string | undefined>;

/** kt00018 응답의 보유 종목 1건 → Position */
const toPosition = (row: Row): Position => ({
  code: normalizeStockCode((row['stk_cd'] ?? '').trim()),
  name: (row['stk_nm'] ?? '').trim(),
  quantity: parseAmount(row['rmnd_qty']) ?? 0,
  orderableQuantity: parseAmount(row['trde_able_qty']),
  averagePrice: parseAmount(row['pur_pric']),
  currentPrice: parseAmount(row['cur_prc']),
  evaluationAmount: parseAmount(row['evlt_amt']),
  // 평가손익과 수익률은 부호 자체가 의미다(절대값을 취하면 안 된다).
  profitLoss: parseSigned(row['evltv_prft']),
  profitLossRate: parseRate(row['prft_rt']),
});

/**
 * kt00018 계좌평가잔고내역요청 + kt00001 예수금상세현황요청 → 잔고 스냅샷.
 *
 * 잔고의 진실은 키움에 있으므로 우리 DB 에 보관하지 않는다. 조회 시점 스냅샷만 만든다.
 */
export const toBalance = (balanceRow: Row, depositRow: Row, positionRows: Row[]): Balance => ({
  totalPurchaseAmount: parseAmount(balanceRow['tot_pur_amt']),
  totalEvaluationAmount: parseAmount(balanceRow['tot_evlt_amt']),
  totalProfitLoss: parseSigned(balanceRow['tot_evlt_pl']),
  totalProfitLossRate: parseRate(balanceRow['tot_prft_rt']),
  deposit: parseAmount(depositRow['entr']),
  orderableCash: parseAmount(depositRow['ord_alow_amt']),
  positions: positionRows.map(toPosition),
  at: new Date().toISOString(),
});

/** ka10075 `io_tp_nm`(주문구분) 문자열에서 매수/매도를 읽는다. "+매수", "-매도정정" 등. */
export const toOrderSide = (label: string | undefined): OrderSide =>
  (label ?? '').includes('매도') ? 'sell' : 'buy';

/** ka10075 `ord_stt`(주문상태) / 실시간 00 의 913 라벨 → 도메인 상태. */
export const toOrderStatus = (label: string | undefined): OrderStatus => {
  const value = (label ?? '').trim();
  if (value.includes('거부')) return 'rejected';
  if (value.includes('취소')) return 'canceled';
  if (value.includes('체결')) return 'filled';
  if (value.includes('접수') || value.includes('확인')) return 'accepted';
  return 'unknown';
};

/** ka10075 미체결요청 → 미체결 주문 목록 */
export const toPendingOrders = (rows: Row[]): PendingOrder[] =>
  rows.map((row) => {
    const orderQuantity = parseAmount(row['ord_qty']);
    const unfilled = parseAmount(row['oso_qty']);
    const status = toOrderStatus(row['ord_stt']);
    return {
      orderNo: (row['ord_no'] ?? '').trim(),
      originalOrderNo: (row['orig_ord_no'] ?? '').trim() || null,
      code: normalizeStockCode((row['stk_cd'] ?? '').trim()),
      name: (row['stk_nm'] ?? '').trim(),
      side: toOrderSide(row['io_tp_nm']),
      orderQuantity,
      unfilledQuantity: unfilled,
      orderPrice: parseAmount(row['ord_pric']),
      orderTypeLabel: (row['trde_tp'] ?? '').trim() || null,
      // 일부만 체결된 주문은 미체결 목록에도 남는다.
      status:
        status === 'filled' && unfilled !== null && orderQuantity !== null && unfilled < orderQuantity
          ? 'partiallyFilled'
          : status,
      orderedAt: parseHms(row['tm']),
    };
  });

/** 실시간 `04`(잔고) 이벤트에서 방향 표시가 필요할 때. */
export const directionOf = directionOfSignCode;
