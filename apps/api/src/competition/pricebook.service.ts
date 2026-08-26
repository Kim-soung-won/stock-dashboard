import { Injectable, Logger } from '@nestjs/common';
import { KiwoomWsSession } from '../kiwoom/kiwoom-ws.session';
import { toTick } from '../kiwoom/realtime.mapper';
import { MarketService } from '../market/market.service';
import { normalizeCode } from './competition.constants';

/**
 * 시세 가격북.
 *
 * 리더보드·포트폴리오 평가에 쓸 **현재가**를 보관한다. CLAUDE.md 의 "실시간은
 * WebSocket, REST 폴링 금지" 원칙에 따라, 가격은 기존 단일 WS 세션의 `0B`(주식체결)
 * 틱으로 채운다. 아직 틱이 한 번도 안 온 종목만 REST 스냅샷(ka10001)으로 한 번
 * 초기값을 채운다(주기적 폴링이 아니라 1회성 시딩).
 *
 * 구독 대상은 "누군가 보유 중인 종목의 합집합"이다. 화면 구독(RealtimeGateway)과
 * 독립적으로 세션 refcount 위에 얹으므로, 아무도 그 종목 화면을 안 봐도 평가가 살아 있다.
 */
@Injectable()
export class PricebookService {
  private readonly logger = new Logger(PricebookService.name);
  private readonly prices = new Map<string, number>();
  /** 가격북이 세션에 걸어둔 구독 종목(정규화 코드). */
  private readonly subscribed = new Set<string>();

  constructor(
    private readonly session: KiwoomWsSession,
    private readonly market: MarketService,
  ) {
    this.session.on('real', (item) => {
      if (item.type !== '0B') return;
      const tick = toTick(item);
      if (tick.price !== null) this.prices.set(tick.code, tick.price);
    });
  }

  /** 마지막으로 관측한 현재가(원). 없으면 null. */
  getPrice(code: string): number | null {
    return this.prices.get(normalizeCode(code)) ?? null;
  }

  /**
   * 보유 종목 합집합을 구독에 반영한다. 새로 들어온 종목만 REG, 빠진 종목만 REMOVE.
   * 새 종목은 REST 스냅샷으로 초기 가격을 한 번 시딩해 즉시 평가 가능하게 한다.
   */
  syncHeldCodes(rawCodes: string[]): void {
    const desired = new Set(rawCodes.map(normalizeCode));

    const added = [...desired].filter((code) => !this.subscribed.has(code));
    const removed = [...this.subscribed].filter((code) => !desired.has(code));

    if (added.length > 0) {
      this.session.subscribe(['0B'], added);
      for (const code of added) {
        this.subscribed.add(code);
        if (!this.prices.has(code)) void this.seedPrice(code);
      }
    }
    if (removed.length > 0) {
      this.session.unsubscribe(['0B'], removed);
      for (const code of removed) this.subscribed.delete(code);
    }
  }

  private async seedPrice(code: string): Promise<void> {
    try {
      const quote = await this.market.getQuote(code);
      if (quote.price !== null && !this.prices.has(code)) this.prices.set(code, quote.price);
    } catch (error) {
      // 초기값 시딩 실패는 치명적이지 않다 — 틱이 오면 채워진다.
      this.logger.debug(`가격 시딩 실패 ${code}: ${(error as Error).message}`);
    }
  }
}
