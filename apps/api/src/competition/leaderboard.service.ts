import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { Leaderboard, LeaderboardEntry } from '@stock/contracts';
import { KiwoomWsSession } from '../kiwoom/kiwoom-ws.session';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { LEADERBOARD_BROADCAST_MS } from './competition.constants';
import { evaluateTotals } from './competition.mapper';
import { PricebookService } from './pricebook.service';
import { SeasonService, toSeason } from './season.service';

/**
 * 순위 계산·브로드캐스트.
 *
 * 보유 종목 시세가 움직이면 순위가 바뀐다. REST 폴링 금지 원칙에 따라, 시세는 WS 틱으로만
 * 들어오고(pricebook), 여기서는 틱이 오면 dirty 표시만 한 뒤 주기적으로(기본 2초)
 * 실제 순위를 계산해 모든 클라이언트에게 팬아웃한다. 매 틱마다 재계산·전송하면 접속자 수
 * × 틱 수만큼 폭증하므로 throttle 한다.
 */
@Injectable()
export class LeaderboardService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(LeaderboardService.name);
  private dirty = true;
  private flushing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly season: SeasonService,
    private readonly pricebook: PricebookService,
    private readonly gateway: RealtimeGateway,
    private readonly wsSession: KiwoomWsSession,
  ) {
    // 보유 종목 시세가 갱신될 때마다 다음 flush 에서 다시 계산하도록 표시한다.
    this.wsSession.on('real', (item) => {
      if (item.type === '0B') this.dirty = true;
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.syncSubscriptions();
    this.timer = setInterval(() => void this.flush(), LEADERBOARD_BROADCAST_MS);
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** 공개 순위 조회(REST). */
  async getLeaderboard(): Promise<Leaderboard> {
    return this.compute();
  }

  /** 보유 구성이 바뀌었을 때(체결 후) — 구독 갱신 + 즉시 브로드캐스트. */
  async onPortfolioChanged(): Promise<void> {
    await this.syncSubscriptions();
    this.dirty = true;
    await this.flush();
  }

  /** 활성 시즌의 전 참가자 보유 종목 합집합을 가격북 구독에 반영한다. */
  private async syncSubscriptions(): Promise<void> {
    const seasonRow = await this.season.getActiveSeasonRow();
    const holdings = await this.prisma.holding.findMany({
      where: { portfolio: { seasonId: seasonRow.id } },
      select: { code: true },
    });
    this.pricebook.syncHeldCodes(holdings.map((holding) => holding.code));
  }

  private async flush(): Promise<void> {
    if (!this.dirty || this.flushing) return;
    this.flushing = true;
    this.dirty = false;
    try {
      const leaderboard = await this.compute();
      this.gateway.broadcastLeaderboard(leaderboard);
    } catch (error) {
      this.logger.warn(`리더보드 브로드캐스트 실패: ${(error as Error).message}`);
    } finally {
      this.flushing = false;
    }
  }

  private async compute(): Promise<Leaderboard> {
    const now = Date.now();
    const seasonRow = await this.season.getActiveSeasonRow();
    const portfolios = await this.prisma.portfolio.findMany({
      where: { seasonId: seasonRow.id },
      include: { participant: true, holdings: true },
    });

    const ranked = portfolios
      .map((portfolio): Omit<LeaderboardEntry, 'rank'> => {
        const totals = evaluateTotals(
          portfolio.startingCash,
          portfolio.cash,
          portfolio.holdings,
          (code) => this.pricebook.getPrice(code),
        );
        return {
          participantId: portfolio.participantId,
          nickname: portfolio.participant.nickname,
          totalValue: totals.totalValue,
          totalProfitLoss: totals.totalProfitLoss,
          totalProfitLossRate: totals.totalProfitLossRate,
          holdingCount: portfolio.holdings.length,
        };
      })
      // 수익률(%) 기준 내림차순. 동률이면 평가금액으로 가른다.
      .sort((a, b) => b.totalProfitLossRate - a.totalProfitLossRate || b.totalValue - a.totalValue);

    return {
      season: toSeason(seasonRow, now),
      entries: ranked.map((entry, index) => ({ rank: index + 1, ...entry })),
      at: new Date(now).toISOString(),
    };
  }
}
