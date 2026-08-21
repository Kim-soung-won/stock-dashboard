import { useMutation } from '@tanstack/react-query';
import type { CancelOrderRequest, PlaceOrderRequest } from '@stock/contracts';
import { OrderService } from '@/shared/api/trading/order';

/**
 * 주문 전송.
 *
 * react-query 의 자동 재시도를 **끈다**. 실패한 주문을 자동으로 다시 보내는 것은
 * 중복 주문 위험이 있고, 멱등키가 있더라도 사용자가 의도하지 않은 재전송이다.
 *
 * 성공 후 잔고·미체결 무효화는 이 훅이 하지 않는다 — 다른 엔티티(account/balance)를
 * 참조하면 같은 계층 슬라이스 간 의존이 되므로, 조합은 features 계층에서 한다.
 */
export const usePlaceOrder = () =>
  useMutation({
    mutationFn: (request: PlaceOrderRequest) => OrderService.placeOrder(request),
    retry: false,
  });

export const useCancelOrder = () =>
  useMutation({
    mutationFn: (request: CancelOrderRequest) => OrderService.cancelOrder(request),
    retry: false,
  });
