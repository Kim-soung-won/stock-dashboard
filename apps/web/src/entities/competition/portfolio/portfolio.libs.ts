import type { OrderSide, TradeRequest } from '@stock/contracts';

/** 매매 폼 값. 시장가만 지원하므로 단가는 없다(서버가 현재가로 체결). */
export interface TradeFormValues {
  code: string;
  side: OrderSide;
  quantity: number;
}

export const toTradeRequest = (values: TradeFormValues): TradeRequest => ({
  code: values.code.trim(),
  side: values.side,
  quantity: values.quantity,
});

/** 폼 단계 검증. 서버도 같은 규칙을 다시 본다. */
export const validateTradeForm = (values: TradeFormValues): string | null => {
  if (values.code.trim().length < 6) return '종목코드를 입력하세요';
  if (values.quantity <= 0) return '수량은 1주 이상이어야 합니다';
  return null;
};

export const SIDE_LABEL: Readonly<Record<OrderSide, string>> = {
  buy: '매수',
  sell: '매도',
};
