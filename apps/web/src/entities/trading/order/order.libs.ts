import type { OrderSide, OrderType, PlaceOrderRequest, TradingEnv } from '@stock/contracts';

/**
 * 주문 조립 규칙.
 *
 * 키움 주문 API 는 멱등하지 않으므로 **주문 1건 = 멱등키 1개**를 클라이언트가 만든다.
 * 폼을 다시 제출하면 새 키가 나와야 하고, 같은 제출의 재시도는 같은 키를 유지해야 한다.
 */

export interface OrderFormValues {
  code: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price: number;
}

export const createIdempotencyKey = (): string => crypto.randomUUID();

export const toPlaceOrderRequest = (
  values: OrderFormValues,
  env: TradingEnv,
  idempotencyKey: string,
): PlaceOrderRequest => ({
  idempotencyKey,
  exchange: 'KRX',
  code: values.code,
  side: values.side,
  quantity: values.quantity,
  // 시장가에는 단가를 보내지 않는다(BFF 가 빈 문자열로 변환).
  ...(values.orderType === 'limit' ? { price: values.price } : {}),
  orderType: values.orderType,
  env,
});

/** 폼 단계에서 걸러낼 수 있는 오류. 서버도 같은 규칙을 다시 검증한다. */
export const validateOrderForm = (values: OrderFormValues): string | null => {
  if (values.code.trim().length < 6) return '종목코드를 입력하세요';
  if (values.quantity <= 0) return '수량은 1주 이상이어야 합니다';
  if (values.orderType === 'limit' && values.price <= 0) return '지정가 주문은 단가가 필요합니다';
  return null;
};

export const SIDE_LABEL: Readonly<Record<OrderSide, string>> = {
  buy: '매수',
  sell: '매도',
};

export const ORDER_TYPE_LABEL: Readonly<Record<OrderType, string>> = {
  limit: '지정가',
  market: '시장가',
};

/** 접수는 체결이 아니다. 사용자에게도 그 구분이 보이게 라벨을 나눈다. */
export const ORDER_STATUS_LABEL = {
  submitting: '전송 중',
  accepted: '접수됨(미체결)',
  partiallyFilled: '일부 체결',
  filled: '체결 완료',
  canceled: '취소됨',
  rejected: '거부됨',
  unknown: '상태 미확인',
} as const;
