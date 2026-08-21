import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type {
  CancelOrderRequest,
  Orderability,
  OrderRecord,
  PlaceOrderRequest,
} from '@stock/contracts';
import type { RestApiId } from '@stock/kiwoom-codes';
import { parseAmount } from '@stock/kiwoom-codes';
import { ENV, type Env } from '../config/env';
import { KiwoomApiError } from '../kiwoom/kiwoom.errors';
import { KiwoomRestClient } from '../kiwoom/kiwoom-rest.client';
import { OrderJournalService, toOrderRecord } from './order-journal.service';
import { OrderTrackerService } from './order-tracker.service';

/** 키움 `trde_tp`(매매구분). 전체 목록은 show kt10000 참고. */
const TRADE_TYPE: Readonly<Record<'limit' | 'market', string>> = {
  limit: '0',
  market: '3',
};

const ORDER_API: Readonly<Record<'buy' | 'sell', RestApiId>> = {
  buy: 'kt10000',
  sell: 'kt10001',
};

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly kiwoom: KiwoomRestClient,
    private readonly journal: OrderJournalService,
    private readonly tracker: OrderTrackerService,
  ) {}

  /**
   * 주문 전송.
   *
   * 순서가 중요하다: (1) 환경 이중 확인 → (2) 저널 선점 → (3) 키움 전송 → (4) 결과 반영.
   * 2번을 3번 앞에 두는 이유는, 전송 도중 죽어도 같은 멱등키가 다시 나가지 않게 하려는 것이다.
   */
  async placeOrder(request: PlaceOrderRequest): Promise<OrderRecord> {
    this.assertEnvMatches(request.env);
    // 접수 이후의 체결을 놓치지 않도록 주문 전에 실시간 추적을 켠다.
    this.tracker.ensureTracking();

    const body = {
      dmst_stex_tp: request.exchange,
      stk_cd: request.code,
      ord_qty: String(request.quantity),
      // 시장가에는 단가를 보내지 않는다(빈 문자열).
      ord_uv: request.orderType === 'market' ? '' : String(request.price ?? ''),
      trde_tp: TRADE_TYPE[request.orderType],
      cond_uv: '',
    };

    const { created, order } = await this.journal.reserve(request, body);
    if (!created) return toOrderRecord(order);

    try {
      const result = await this.kiwoom.call<{ ord_no?: string }>(ORDER_API[request.side], body);
      const orderNo = result.data.ord_no?.trim();
      if (!orderNo) {
        return toOrderRecord(
          await this.journal.markFailed(order.id, '주문번호가 응답에 없습니다', result.data),
        );
      }
      this.logger.log(
        `주문 접수 (${request.env}) ${request.side} ${request.code} x${request.quantity} → ord_no=${orderNo}`,
      );
      return toOrderRecord(await this.journal.markAccepted(order.id, orderNo, result.data));
    } catch (error) {
      const reason =
        error instanceof KiwoomApiError
          ? `[${error.returnCode}] ${error.returnMessage}`
          : (error as Error).message;
      await this.journal.markFailed(order.id, reason);
      throw error;
    }
  }

  /** 취소 주문(kt10003). 원주문번호가 필요하다. */
  async cancelOrder(request: CancelOrderRequest): Promise<OrderRecord> {
    this.assertEnvMatches(request.env);

    const body = {
      dmst_stex_tp: request.exchange,
      orig_ord_no: request.originalOrderNo,
      stk_cd: request.code,
      cncl_qty: String(request.quantity),
    };

    const { created, order } = await this.journal.reserve(
      {
        idempotencyKey: request.idempotencyKey,
        exchange: request.exchange,
        code: request.code,
        side: 'sell',
        quantity: request.quantity,
        orderType: 'market',
        env: request.env,
      },
      body,
    );
    if (!created) return toOrderRecord(order);

    const result = await this.kiwoom.call<{ ord_no?: string }>('kt10003', body);
    return toOrderRecord(
      await this.journal.markAccepted(order.id, result.data.ord_no?.trim() ?? '', result.data),
    );
  }

  /**
   * 주문 전 가능 금액·수량 확인 (kt00010 / kt00011).
   * 주문 화면은 전송 직전에 이 값을 확인한다.
   */
  async getOrderability(code: string, price: number): Promise<Orderability> {
    const [cash, quantity] = await Promise.all([
      this.kiwoom.call<Record<string, string>>('kt00010', {
        io_amt: '',
        stk_cd: code,
        trde_tp: '2',
        trde_qty: '',
        uv: String(price),
        exp_buy_unp: String(price),
      }),
      this.kiwoom.call<Record<string, string>>('kt00011', { stk_cd: code, uv: String(price) }),
    ]);

    // kt00011 은 주문가능수량을 증거금율 구간별로 준다(profa_20ord_alowq …).
    // 미수가 발생하지 않는 `min_ord_alowq`(미수불가 주문가능수량)를 기본값으로 쓴다.
    return {
      code,
      orderableCash: parseAmount(cash.data['ord_alowa']),
      orderableQuantity: parseAmount(
        quantity.data['min_ord_alowq'] ?? quantity.data['profa_100ord_alowq'],
      ),
    };
  }

  async listOrders(): Promise<OrderRecord[]> {
    return (await this.journal.list()).map(toOrderRecord);
  }

  /**
   * 실전/모의 이중 확인.
   *
   * 서버가 mock 인데 real 주문이 오면(또는 반대) 거부한다. 프론트의 토글 하나가
   * 실수로 켜져 실주문이 나가는 사고를 막기 위한 최후 방어선이다.
   */
  private assertEnvMatches(requested: 'mock' | 'real'): void {
    if (requested !== this.env.KIWOOM_ENV) {
      throw new BadRequestException(
        `주문 환경이 서버 설정과 다릅니다 (요청=${requested}, 서버=${this.env.KIWOOM_ENV}). ` +
          '실전 전환은 서버 .env 의 KIWOOM_ENV 를 바꿔야 합니다.',
      );
    }
  }
}
