import { API_ROUTES } from '@stock/contracts';
import type { CancelOrderRequest, PlaceOrderRequest } from '@stock/contracts';
import { BaseService } from '../../base';
import { OrderDtoSchemas } from './order-dto.contracts';
import type { OrderDtoTypes } from './order-dto.types';

export const OrderService = {
  /**
   * 주문 전송. 멱등키는 호출자가 만들어 넣는다 — 재시도·중복 클릭이 중복 주문이 되지
   * 않게 막는 유일한 장치다(키움 주문 API 는 멱등하지 않다).
   */
  placeOrder: (request: PlaceOrderRequest): Promise<OrderDtoTypes.Order> =>
    BaseService.post(API_ROUTES.trading.orders, OrderDtoSchemas.order, request),

  cancelOrder: (request: CancelOrderRequest): Promise<OrderDtoTypes.Order> =>
    BaseService.post(API_ROUTES.trading.cancel, OrderDtoSchemas.order, request),

  fetchOrderability: (code: string, price: number): Promise<OrderDtoTypes.Orderability> =>
    BaseService.get(
      API_ROUTES.trading.orderability(code) + '?price=' + price,
      OrderDtoSchemas.orderability,
    ),

  /** 우리 주문 저널(BFF DB). 키움 조회가 아니다. */
  fetchOrders: (): Promise<OrderDtoTypes.OrderList> =>
    BaseService.get(API_ROUTES.trading.orders, OrderDtoSchemas.orderList),
};
