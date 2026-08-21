import { z } from 'zod';
import { orderSideSchema, orderStatusSchema } from './account';

/**
 * 주문 도메인 계약.
 *
 * 키움 주문 API(kt10000~kt10003)는 **멱등하지 않다.** 재시도·중복 클릭이 그대로
 * 중복 주문이 되므로 클라이언트가 `idempotencyKey` 를 만들어 보내고, BFF 는 그 키로
 * 주문 저널(DB)에 선점 기록을 남긴 뒤에만 키움에 전송한다.
 */

export const orderTypeSchema = z.enum(['limit', 'market']);
export type OrderType = z.infer<typeof orderTypeSchema>;

/** 국내 거래소 구분 (주문계 `dmst_stex_tp`). */
export const exchangeSchema = z.enum(['KRX', 'NXT', 'SOR']);
export type Exchange = z.infer<typeof exchangeSchema>;

/** 주문 실행 환경. mock 이 기본값이고 real 은 명시적으로만 켠다. */
export const tradingEnvSchema = z.enum(['mock', 'real']);
export type TradingEnv = z.infer<typeof tradingEnvSchema>;

export const placeOrderRequestSchema = z
  .object({
    /** 클라이언트 생성 멱등키(UUID). 같은 키로 두 번 보내면 두 번째는 전송되지 않는다 */
    idempotencyKey: z.string().min(8).max(64),
    exchange: exchangeSchema.default('KRX'),
    code: z.string().min(6).max(12),
    side: orderSideSchema,
    quantity: z.number().int().positive(),
    /** limit 일 때 필수. market 이면 무시된다(키움에 빈 문자열로 전송) */
    price: z.number().int().nonnegative().optional(),
    orderType: orderTypeSchema,
    /** 실전 주문은 이 값을 'real' 로 명시해야 통과한다(오조작 방지 이중 확인) */
    env: tradingEnvSchema,
  })
  .refine((value) => value.orderType !== 'limit' || typeof value.price === 'number', {
    message: 'limit 주문은 price 가 필요합니다',
    path: ['price'],
  });
export type PlaceOrderRequest = z.infer<typeof placeOrderRequestSchema>;

export const cancelOrderRequestSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  exchange: exchangeSchema.default('KRX'),
  /** 취소할 원주문번호 */
  originalOrderNo: z.string().min(1),
  code: z.string().min(6).max(12),
  /** 0 이면 전량 취소 */
  quantity: z.number().int().nonnegative(),
  env: tradingEnvSchema,
});
export type CancelOrderRequest = z.infer<typeof cancelOrderRequestSchema>;

/** 주문 저널 1건 — 우리 DB 가 보관하는 유일한 거래 상태. */
export const orderRecordSchema = z.object({
  id: z.string(),
  idempotencyKey: z.string(),
  /** 키움이 부여한 주문번호. 접수 전에는 null */
  orderNo: z.string().nullable(),
  code: z.string(),
  name: z.string().nullable(),
  side: orderSideSchema,
  orderType: orderTypeSchema,
  exchange: exchangeSchema,
  quantity: z.number(),
  price: z.number().nullable(),
  filledQuantity: z.number(),
  averageFilledPrice: z.number().nullable(),
  status: orderStatusSchema,
  env: tradingEnvSchema,
  /** 거부·실패 사유 (키움 return_msg 또는 내부 사유) */
  failureReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OrderRecord = z.infer<typeof orderRecordSchema>;

/** 주문 가능 금액·수량 사전 확인 (kt00010 / kt00011). */
export const orderabilitySchema = z.object({
  code: z.string(),
  /** 주문가능금액(원) */
  orderableCash: z.number().nullable(),
  /** 증거금률별 주문가능수량(주) */
  orderableQuantity: z.number().nullable(),
});
export type Orderability = z.infer<typeof orderabilitySchema>;
