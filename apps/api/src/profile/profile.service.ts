import { Injectable, NotFoundException } from '@nestjs/common';
import type { Participant as ParticipantRow } from '@prisma/client';
import type {
  ParticipantProfile,
  UpdateProfileRequest,
  WatchlistItem,
} from '@stock/contracts';
import { toParticipant } from '../auth/auth.service';
import { CompetitionService } from '../competition/competition.service';
import { LeaderboardService } from '../competition/leaderboard.service';
import { PrismaService } from '../prisma/prisma.service';

/** 프로필에 노출할 최근 체결 수. */
const RECENT_TRADES = 20;

/**
 * 프로필 = 여러 도메인의 읽기 전용 합성 뷰.
 *
 * 신원(Participant) + 경쟁 지표(포트폴리오·리더보드 순위) + 보유·최근 체결 + 관심종목을
 * 한 번에 모은다. 조회는 공개이고, 편집은 본인만(bio·아바타 이모지) — 닉네임/PIN 은 여기서
 * 다루지 않는다.
 */
@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competition: CompetitionService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async getProfile(participantId: string): Promise<ParticipantProfile> {
    const participant = await this.prisma.participant.findUnique({ where: { id: participantId } });
    if (!participant) throw new NotFoundException('존재하지 않는 사용자입니다');

    // 포트폴리오·순위·체결·관심종목을 병렬로 모은다(전부 읽기).
    const [portfolio, leaderboard, recentTrades, watchlistRows] = await Promise.all([
      this.competition.getPortfolio(participant),
      this.leaderboard.getLeaderboard(),
      this.competition.listTrades(participant, RECENT_TRADES),
      this.prisma.watchlistItem.findMany({
        where: { participantId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const rank = leaderboard.entries.find((entry) => entry.participantId === participantId)?.rank ?? null;

    return {
      participant: toParticipant(participant),
      stats: {
        rank,
        totalValue: portfolio.totalValue,
        totalProfitLoss: portfolio.totalProfitLoss,
        totalProfitLossRate: portfolio.totalProfitLossRate,
        holdingCount: portfolio.holdings.length,
      },
      holdings: portfolio.holdings,
      recentTrades,
      watchlist: watchlistRows.map(toWatchlistItem),
    };
  }

  /** 본인 프로필 편집. 보낸 필드만 반영한다(undefined 는 유지, null 은 지움). */
  async updateMine(
    participant: ParticipantRow,
    request: UpdateProfileRequest,
  ): Promise<ParticipantProfile> {
    await this.prisma.participant.update({
      where: { id: participant.id },
      data: {
        ...(request.bio !== undefined ? { bio: request.bio } : {}),
        ...(request.avatarEmoji !== undefined ? { avatarEmoji: request.avatarEmoji } : {}),
      },
    });
    return this.getProfile(participant.id);
  }
}

const toWatchlistItem = (row: {
  code: string;
  name: string | null;
  createdAt: Date;
}): WatchlistItem => ({
  code: row.code,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});
