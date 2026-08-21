import { z } from 'zod';
import { executionSchema } from './account';
import { marketStatusSchema, orderBookSchema, priceDirectionSchema } from './market';

/**
 * 브라우저 <-> BFF 실시간 채널 계약.
 *
 * 키움 WebSocket 세션은 BFF 가 **하나만** 유지하고(토큰 노출 방지 + 유량 관리),
 * 브라우저에는 정규화된 이벤트만 팬아웃한다. 브라우저는 종목코드로 구독을 요청하고,
 * BFF 가 키움 쪽 REG/REMOVE 와 그룹번호(grp_no)를 대신 관리한다.
 */

/** 클라이언트 → BFF */
export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscribe'),
    /** 화면 단위 구독 그룹. 화면 전환 시 이 키로 한꺼번에 해지한다 */
    channel: z.string().min(1),
    codes: z.array(z.string()).max(100),
    /** 원하는 스트림. 기본 tick */
    streams: z.array(z.enum(['tick', 'orderBook'])).default(['tick']),
  }),
  z.object({
    type: z.literal('unsubscribe'),
    channel: z.string().min(1),
  }),
  z.object({ type: z.literal('ping') }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

/** 체결 티커 (키움 실시간 `0B` 주식체결 정규화). */
export const tickSchema = z.object({
  code: z.string(),
  price: z.number().nullable(),
  direction: priceDirectionSchema,
  change: z.number().nullable(),
  changeRate: z.number().nullable(),
  /** 누적거래량(주) */
  volume: z.number().nullable(),
  /** 체결시간 HH:mm:ss */
  at: z.string().nullable(),
});
export type Tick = z.infer<typeof tickSchema>;

/** BFF → 클라이언트 */
export const serverMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tick'), payload: tickSchema }),
  z.object({ type: z.literal('orderBook'), payload: orderBookSchema }),
  z.object({ type: z.literal('marketStatus'), payload: marketStatusSchema }),
  /** 키움 실시간 `00` 주문체결 */
  z.object({ type: z.literal('execution'), payload: executionSchema }),
  /** 키움 세션 상태. disconnected 면 화면에 경고를 띄운다 */
  z.object({
    type: z.literal('sessionState'),
    payload: z.object({
      upstream: z.enum(['connecting', 'ready', 'disconnected']),
      subscribedCodes: z.number(),
      message: z.string().nullable().default(null),
    }),
  }),
  z.object({ type: z.literal('pong') }),
  z.object({
    type: z.literal('error'),
    payload: z.object({ message: z.string(), kiwoomCode: z.string().nullable().default(null) }),
  }),
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;
