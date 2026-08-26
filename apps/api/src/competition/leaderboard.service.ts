import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { Leaderboard, LeaderboardEntry, LeaderboardHistory } from '@stock/contracts';
import { KiwoomWsSession } from '../kiwoom/kiwoom-ws.session';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { LEADERBOARD_BROADCAST_MS, SNAPSHOT_INTERVAL_MS } from './competition.constants';
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
  private snapshotTimer: NodeJS.Timeout | null = null;

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
    // 총평가금액 시계열 적재(라인차트용). 브로드캐스트보다 훨씬 성기게 남긴다.
    this.snapshotTimer = setInterval(() => void this.snapshot(), SNAPSHOT_INTERVAL_MS);
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
  }

  /** 공개 순위 조회(REST). */
  async getLeaderboard(): Promise<Leaderboard> {
    return this.compute();
  }

  /**
   * 참가자별 총평가금액 추이(공개, 라인차트용). 적재된 스냅샷을 참가자별 시계열로 묶는다.
   * 스냅샷이 아직 없는 참가자는 series 에 나타나지 않는다(그릴 점이 없다).
   */
  async getHistory(): Promise<LeaderboardHistory> {
    const now = Date.now();
    const seasonRow = await this.season.getActiveSeasonRow();
    const snapshots = await this.prisma.portfolioSnapshot.findMany({
      where: { seasonId: seasonRow.id },
      orderBy: { createdAt: 'asc' },
    });
    // 참가자 id → 닉네임 (스냅샷은 닉네임을 담지 않으므로 조인 대신 한 번 읽어 매핑한다).
    const portfolios = await this.prisma.portfolio.findMany({
      where: { seasonId: seasonRow.id },
      include: { participant: { select: { nickname: true } } },
    });
    const nickname = new Map(portfolios.map((p) => [p.participantId, p.participant.nickname]));

    const byParticipant = new Map<string, LeaderboardHistory['series'][number]>();
    for (const snap of snapshots) {
      let series = byParticipant.get(snap.participantId);
      if (!series) {
        series = {
          participantId: snap.participantId,
          nickname: nickname.get(snap.participantId) ?? snap.participantId,
          points: [],
        };
        byParticipant.set(snap.participantId, series);
      }
      series.points.push({
        at: snap.createdAt.toISOString(),
        totalValue: snap.totalValue,
        totalProfitLossRate: snap.totalProfitLossRate,
      });
    }

    return {
      seasonId: seasonRow.id,
      series: [...byParticipant.values()],
      at: new Date(now).toISOString(),
    };
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

  /** 현재 총평가금액을 참가자별로 한 점씩 적재한다(라인차트 시계열). */
  private async snapshot(): Promise<void> {
    try {
      const leaderboard = await this.compute();
      if (leaderboard.entries.length === 0) return;
      const seasonId = leaderboard.season.id;
      await this.prisma.portfolioSnapshot.createMany({
        data: leaderboard.entries.map((entry) => ({
          seasonId,
          participantId: entry.participantId,
          totalValue: Math.round(entry.totalValue),
          totalProfitLossRate: entry.totalProfitLossRate,
        })),
      });
    } catch (error) {
      this.logger.warn(`스냅샷 적재 실패: ${(error as Error).message}`);
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
