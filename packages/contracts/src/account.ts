import { z } from 'zod';

/**
 * 계좌 도메인 계약.
 *
 * 잔고·예수금의 진실은 키움에 있다. BFF 는 캐시하지 않고 조회 시점 스냅샷만 전달한다
 * (우리 DB 에 보관하는 것은 주문 저널뿐 — trading.ts).
 */

/** 보유 종목 1건 (kt00018 계좌평가잔고내역요청). */
export const positionSchema = z.object({
  code: z.string(),
  name: z.string(),
  /** 보유수량(주) */
  quantity: z.number(),
  /** 주문가능수량(주). 미체결 매도 등으로 보유수량보다 작을 수 있다 */
  orderableQuantity: z.number().nullable(),
  /** 매입평균가(원) */
  averagePrice: z.number().nullable(),
  currentPrice: z.number().nullable(),
  /** 평가금액(원) */
  evaluationAmount: z.number().nullable(),
  /** 평가손익(원). 부호 있음 */
  profitLoss: z.number().nullable(),
  /** 수익률 %. 부호 있음 */
  profitLossRate: z.number().nullable(),
});
export type Position = z.infer<typeof positionSchema>;

/** 잔고 요약 + 보유 종목. */
export const balanceSchema = z.object({
  /** 총매입금액(원) */
  totalPurchaseAmount: z.number().nullable(),
  /** 총평가금액(원) */
  totalEvaluationAmount: z.number().nullable(),
  /** 총평가손익(원) */
  totalProfitLoss: z.number().nullable(),
  /** 총수익률 % */
  totalProfitLossRate: z.number().nullable(),
  /** 예수금(원) — kt00001 예수금상세현황요청 */
  deposit: z.number().nullable(),
  /** 주문가능금액(원) */
  orderableCash: z.number().nullable(),
  positions: z.array(positionSchema),
  at: z.string(),
});
export type Balance = z.infer<typeof balanceSchema>;

export const orderSideSchema = z.enum(['buy', 'sell']);
export type OrderSide = z.infer<typeof orderSideSchema>;

/**
 * 주문 상태.
 *
 * 키움 실시간 `00`(주문체결)의 `913` 주문상태(접수/체결/확인/취소/거부)와
 * 주문 API 응답을 합쳐 BFF 가 판정한다. **주문 응답의 `ord_no` 는 접수일 뿐이다.**
 */
export const orderStatusSchema = z.enum([
  'submitting',
  'accepted',
  'partiallyFilled',
  'filled',
  'canceled',
  'rejected',
  'unknown',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** 미체결 주문 1건 (ka10075 미체결요청). */
export const pendingOrderSchema = z.object({
  /** 키움 주문번호 */
  orderNo: z.string(),
  originalOrderNo: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  side: orderSideSchema,
  orderQuantity: z.number().nullable(),
  unfilledQuantity: z.number().nullable(),
  orderPrice: z.number().nullable(),
  /** 키움 매매구분 원문 라벨(보통/시장가/...) */
  orderTypeLabel: z.string().nullable(),
  status: orderStatusSchema,
  /** HH:mm:ss */
  orderedAt: z.string().nullable(),
});
export type PendingOrder = z.infer<typeof pendingOrderSchema>;

/** 체결 1건 (ka10076 체결요청 / 실시간 00). */
export const executionSchema = z.object({
  orderNo: z.string(),
  code: z.string(),
  name: z.string(),
  side: orderSideSchema,
  filledQuantity: z.number().nullable(),
  filledPrice: z.number().nullable(),
  filledAt: z.string().nullable(),
});
export type Execution = z.infer<typeof executionSchema>;
