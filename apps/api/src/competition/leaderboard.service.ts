import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Leaderboard, LeaderboardEntry, LeaderboardHistory } from '@stock/contracts';
import { KiwoomWsSession } from '../kiwoom/kiwoom-ws.session';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  HISTORY_WINDOW_DAYS,
  LEADERBOARD_BROADCAST_MS,
  SNAPSHOT_CRON,
  SNAPSHOT_TIMEZONE,
  STARTING_CASH,
} from './competition.constants';
import { evaluateTotals } from './competition.mapper';
import { PricebookService } from './pricebook.service';
import { SeasonService, toSeason } from './season.service';

const DAY_MS = 24 * 60 * 60 * 1000;
/** 한국은 서머타임이 없어 UTC+9 고정. 스냅샷을 '거래일(KST)' 단위로 묶을 때 쓴다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 어떤 시각이 속한 KST 거래일 키(자정 경계로 나눈 정수). 같은 날이면 같은 값. */
const kstDayKey = (date: Date): number => Math.floor((date.getTime() + KST_OFFSET_MS) / DAY_MS);

/** 지금이 속한 KST 거래일의 시작(UTC 기준 Date). '오늘 이미 적재됐나' 판정에 쓴다. */
const startOfKstDay = (nowMs: number): Date =>
  new Date(Math.floor((nowMs + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS);

/** 장마감(15:30 KST)까지의 오프셋(ms). 데이터 없는 날의 대표 시각으로 쓴다. */
const KST_CLOSE_MS = (15 * 60 + 30) * 60 * 1000;

/** 어떤 KST 거래일의 종가 시각(15:30 KST)을 UTC Date 로. 스냅샷 없는 날 축 위치로 쓴다. */
const kstCloseOf = (dayKey: number): Date =>
  new Date(dayKey * DAY_MS - KST_OFFSET_MS + KST_CLOSE_MS);

type SnapshotRow = {
  participantId: string;
  totalValue: number;
  totalProfitLossRate: number;
  createdAt: Date;
};

/**
 * 일별 스냅샷을 라인차트용 참가자별 시계열로 정렬한다(순수 함수 — 직접 테스트한다).
 *
 * - **고정 30일 축**: 오늘(KST) 기준 뒤로 `windowDays` 일을 통째로 축으로 깐다. 시즌 시작·데이터
 *   유무와 무관하게 차트 폭이 항상 30일로 고정된다(시즌 개념은 조회 범위에만 쓰고 축엔 안 쓴다).
 *   각 날의 대표 시각은 실제 스냅샷 시각(있으면)·아니면 종가(15:30 KST)로, 모든 곡선이 공유해
 *   세로로 정렬된다.
 * - **시드 백필**: 참가자가 처음 등장하기 전(=데이터 없는 앞 구간) 날짜는 **시드(STARTING_CASH·0%)**
 *   로 채운다. 모두 100만으로 시작하므로 baseline 이 되고, 첫 스냅샷만 있어도 30점이라 곡선이
 *   바로 그려진다. 0 으로 채우면 y축(scale)이 0까지 내려가 전부 납작해지고 가짜 급등이 생긴다.
 * - **빈 날 이월**: 중간에 빠진 날(주말·휴장 등)은 직전 값을 이어 붙여(carry-forward) 선을 끊지 않는다.
 */
export const buildDailyHistory = (
  snapshots: SnapshotRow[],
  nickname: Map<string, string>,
  nowMs: number,
  windowDays: number,
): LeaderboardHistory['series'] => {
  if (snapshots.length === 0) return [];

  // 실제 스냅샷이 있는 날의 대표 시각(그 날 첫 스냅샷 시각).
  const realAt = new Map<number, Date>();
  for (const snap of snapshots) {
    const key = kstDayKey(snap.createdAt);
    if (!realAt.has(key)) realAt.set(key, snap.createdAt);
  }

  // 1) 고정 축: 오늘 기준 뒤로 windowDays 일(오래된→오늘). 데이터 없는 날은 종가 시각으로 채운다.
  const todayKey = kstDayKey(new Date(nowMs));
  const columns: { dayKey: number; at: Date }[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const dayKey = todayKey - i;
    columns.push({ dayKey, at: realAt.get(dayKey) ?? kstCloseOf(dayKey) });
  }

  // 2) 참가자별 (거래일 → 값). 같은 날 여러 점이면 asc 정렬이라 마지막(종가)이 남는다.
  const byParticipant = new Map<
    string,
    Map<number, { totalValue: number; totalProfitLossRate: number }>
  >();
  const order: string[] = [];
  for (const snap of snapshots) {
    let perDay = byParticipant.get(snap.participantId);
    if (!perDay) {
      perDay = new Map();
      byParticipant.set(snap.participantId, perDay);
      order.push(snap.participantId);
    }
    perDay.set(kstDayKey(snap.createdAt), {
      totalValue: snap.totalValue,
      totalProfitLossRate: snap.totalProfitLossRate,
    });
  }

  // 3) 각 참가자를 축에 맞춰 채운다. 첫 등장 전은 시드, 이후 빈 날은 직전 값 이월.
  return order.map((participantId) => {
    const perDay = byParticipant.get(participantId)!;
    let lastValue = STARTING_CASH;
    let lastRate = 0;
    const points = columns.map(({ dayKey, at }) => {
      const real = perDay.get(dayKey);
      if (real) {
        lastValue = real.totalValue;
        lastRate = real.totalProfitLossRate;
      }
      return {
        at: at.toISOString(),
        totalValue: lastValue,
        totalProfitLossRate: lastRate,
      };
    });
    return {
      participantId,
      nickname: nickname.get(participantId) ?? participantId,
      points,
    };
  });
};

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

  /** 일별 종가 스냅샷 — 평일 장마감 15:30(KST)에 하루 한 점씩 적재한다(라인차트 시계열). */
  @Cron(SNAPSHOT_CRON, { timeZone: SNAPSHOT_TIMEZONE })
  async snapshotDaily(): Promise<void> {
    await this.snapshot();
  }

  /** 공개 순위 조회(REST). */
  async getLeaderboard(): Promise<Leaderboard> {
    return this.compute();
  }

  /**
   * 참가자별 총평가금액 추이(공개, 라인차트용). 고정 30일 축에 일별 스냅샷을 정렬하고, 데이터
   * 없는 앞 구간·늦게 들어온 참가자는 시드로 백필한다(축·백필 규칙은 `buildDailyHistory`).
   * 시즌은 **어떤 스냅샷을 읽을지 범위만** 정하고(다른 시즌 데이터 안 섞이게), 축엔 관여하지 않는다.
   * 스냅샷이 아직 하나도 없는 참가자는 series 에 나타나지 않는다(그릴 점이 없다).
   */
  async getHistory(): Promise<LeaderboardHistory> {
    const now = Date.now();
    const seasonRow = await this.season.getActiveSeasonRow();
    // 축은 30일이지만 경계 시각차로 30일 전 종가를 놓치지 않도록 하루 여유를 두고 조회한다.
    const since = new Date(now - (HISTORY_WINDOW_DAYS + 1) * DAY_MS);
    const snapshots = await this.prisma.portfolioSnapshot.findMany({
      where: { seasonId: seasonRow.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });
    // 참가자 id → 닉네임 (스냅샷은 닉네임을 담지 않으므로 조인 대신 한 번 읽어 매핑한다).
    const portfolios = await this.prisma.portfolio.findMany({
      where: { seasonId: seasonRow.id },
      include: { participant: { select: { nickname: true } } },
    });
    const nickname = new Map(portfolios.map((p) => [p.participantId, p.participant.nickname]));

    return {
      seasonId: seasonRow.id,
      series: buildDailyHistory(snapshots, nickname, now, HISTORY_WINDOW_DAYS),
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

  /**
   * 현재 총평가금액을 참가자별로 하루 한 점 적재한다(라인차트 시계열).
   * 재시작·중복 실행에 안전하도록, 오늘(KST) 이미 적재됐으면 건너뛴다.
   */
  private async snapshot(): Promise<void> {
    try {
      const seasonRow = await this.season.getActiveSeasonRow();
      const already = await this.prisma.portfolioSnapshot.count({
        where: { seasonId: seasonRow.id, createdAt: { gte: startOfKstDay(Date.now()) } },
      });
      if (already > 0) {
        this.logger.log('오늘 스냅샷이 이미 있어 건너뜁니다');
        return;
      }
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
