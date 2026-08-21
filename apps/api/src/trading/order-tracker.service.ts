import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KiwoomWsSession } from '../kiwoom/kiwoom-ws.session';
import { toExecution, toOrderStatusFromRealtime } from '../kiwoom/realtime.mapper';
import { OrderJournalService } from './order-journal.service';

/**
 * 주문 상태 추적기.
 *
 * 주문 API 응답의 `ord_no` 는 **접수**일 뿐이고, 체결 확정은 실시간 `00`(주문체결)
 * 이벤트로만 알 수 있다. 그 간극을 이 서비스가 메워 저널 상태를 전이시킨다.
 *
 * `00` 구독은 계좌 전체 이벤트라 종목코드가 필요 없다(`item` 을 빈 문자열로 등록).
 * 첫 주문 시점에 한 번만 등록하고, 이후에는 세션이 재접속 때 알아서 재등록한다.
 */
@Injectable()
export class OrderTrackerService implements OnModuleInit {
  private readonly logger = new Logger(OrderTrackerService.name);
  private tracking = false;

  constructor(
    private readonly session: KiwoomWsSession,
    private readonly journal: OrderJournalService,
  ) {}

  onModuleInit(): void {
    this.session.on('real', (item) => {
      if (item.type !== '00') return;
      const execution = toExecution(item);
      if (!execution.orderNo) return;

      void this.journal
        .applyExecution({
          orderNo: execution.orderNo,
          status: toOrderStatusFromRealtime(item),
          sourceLabel: (item.values['913'] ?? '').trim() || null,
          filledQuantity: execution.filledQuantity,
          filledPrice: execution.filledPrice,
          payload: item.values,
        })
        .catch((error: Error) => this.logger.error(`체결 반영 실패: ${error.message}`));
    });
  }

  /** 주문을 내기 전에 호출한다. 여러 번 불러도 구독은 한 번만 등록된다. */
  ensureTracking(): void {
    if (this.tracking) return;
    this.tracking = true;
    this.session.subscribe(['00'], ['']);
    this.logger.log('주문체결(00) 실시간 추적 시작');
  }
}
