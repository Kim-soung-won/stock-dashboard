import { Injectable, Logger } from '@nestjs/common';
import type { Order } from '@prisma/client';
import type { OrderRecord, PlaceOrderRequest } from '@stock/contracts';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 주문 저널.
 *
 * 키움 주문 API 는 멱등하지 않다. 그래서 "키움에 보내기 전에" 멱등키로 행을 선점하고,
 * 중복 판정을 전송 결과가 아니라 DB unique 제약이 하게 만든다. 네트워크 타임아웃처럼
 * 결과를 모르는 상황에서도 두 번 나가지 않는 것이 이 설계의 목적이다.
 */
@Injectable()
export class OrderJournalService {
  private readonly logger = new Logger(OrderJournalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 멱등키를 선점한다.
   * @returns created=false 면 같은 키의 주문이 이미 있다는 뜻이고, 절대 재전송하지 않는다.
   */
  async reserve(
    request: PlaceOrderRequest,
    requestSnapshot: unknown,
  ): Promise<{ created: boolean; order: Order }> {
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: request.idempotencyKey },
    });
    if (existing) {
      this.logger.warn(`멱등키 중복 — 재전송하지 않음: ${request.idempotencyKey}`);
      return { created: false, order: existing };
    }

    const order = await this.prisma.order.create({
      data: {
        idempotencyKey: request.idempotencyKey,
        code: request.code,
        side: request.side,
        orderType: request.orderType,
        exchange: request.exchange,
        quantity: request.quantity,
        price: request.price ?? null,
        env: request.env,
        status: 'submitting',
        requestSnapshot: JSON.stringify(requestSnapshot),
      },
    });
    await this.appendEvent(order.id, 'submitted', { payload: requestSnapshot });
    return { created: true, order };
  }

  async markAccepted(orderId: string, orderNo: string, response: unknown): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      // 접수(accepted)일 뿐 체결이 아니다. 체결은 실시간 00 이벤트로만 확정한다.
      data: { orderNo, status: 'accepted', responseSnapshot: JSON.stringify(response) },
    });
    await this.appendEvent(orderId, 'accepted', { payload: response });
    return order;
  }

  async markFailed(orderId: string, reason: string, response?: unknown): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'rejected',
        failureReason: reason,
        responseSnapshot: response ? JSON.stringify(response) : null,
      },
    });
    await this.appendEvent(orderId, 'rejected', { payload: response ?? { reason } });
    return order;
  }

  /**
   * 실시간 `00`(주문체결) 이벤트를 반영한다.
   * 상태는 덮어쓰지만 이력은 append-only 로 남겨 손익 재계산이 가능하게 한다.
   */
  async applyExecution(params: {
    orderNo: string;
    status: OrderRecord['status'];
    sourceLabel: string | null;
    filledQuantity: number | null;
    filledPrice: number | null;
    payload: unknown;
  }): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { orderNo: params.orderNo },
      orderBy: { createdAt: 'desc' },
    });
    if (!order) {
      // 이 프로세스가 내지 않은 주문(HTS·모바일에서 낸 주문)도 이벤트로 들어온다.
      this.logger.debug(`저널에 없는 주문번호 이벤트 무시: ${params.orderNo}`);
      return;
    }

    const filledQuantity = params.filledQuantity ?? 0;
    const totalFilled = order.filledQuantity + filledQuantity;
    const averageFilledPrice =
      params.filledPrice !== null && totalFilled > 0
        ? Math.round(
            ((order.averageFilledPrice ?? 0) * order.filledQuantity +
              params.filledPrice * filledQuantity) /
              totalFilled,
          )
        : order.averageFilledPrice;

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: params.status, filledQuantity: totalFilled, averageFilledPrice },
    });
    await this.appendEvent(order.id, params.status, {
      sourceLabel: params.sourceLabel,
      filledQuantity: params.filledQuantity,
      filledPrice: params.filledPrice,
      payload: params.payload,
    });
  }

  async list(limit = 50): Promise<Order[]> {
    return this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  }

  private async appendEvent(
    orderId: string,
    kind: string,
    detail: {
      sourceLabel?: string | null;
      filledQuantity?: number | null;
      filledPrice?: number | null;
      payload?: unknown;
    },
  ): Promise<void> {
    await this.prisma.orderEvent.create({
      data: {
        orderId,
        kind,
        sourceLabel: detail.sourceLabel ?? null,
        filledQuantity: detail.filledQuantity ?? null,
        filledPrice: detail.filledPrice ?? null,
        payload: detail.payload ? JSON.stringify(detail.payload) : null,
      },
    });
  }
}

/** Prisma row → 프론트 계약 */
export const toOrderRecord = (order: Order): OrderRecord => ({
  id: order.id,
  idempotencyKey: order.idempotencyKey,
  orderNo: order.orderNo,
  code: order.code,
  name: order.name,
  side: order.side as OrderRecord['side'],
  orderType: order.orderType as OrderRecord['orderType'],
  exchange: order.exchange as OrderRecord['exchange'],
  quantity: order.quantity,
  price: order.price,
  filledQuantity: order.filledQuantity,
  averageFilledPrice: order.averageFilledPrice,
  status: order.status as OrderRecord['status'],
  env: order.env as OrderRecord['env'],
  failureReason: order.failureReason,
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
});
