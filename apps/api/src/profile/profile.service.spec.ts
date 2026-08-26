import { NotFoundException } from '@nestjs/common';
import type { Participant as ParticipantRow } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompetitionService } from '../competition/competition.service';
import type { LeaderboardService } from '../competition/leaderboard.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from './profile.service';

/**
 * 프로필(읽기 전용 합성 뷰)의 계약을 고정한다.
 *  - 순위는 리더보드에서 "이 참가자" 항목으로 채우고, 없으면 null.
 *  - 요약 지표는 포트폴리오에서, 보유 수는 holdings 길이에서 온다.
 *  - 없는 참가자는 404.
 *  - 편집은 보낸 필드만 반영한다(undefined 제외, null 은 지움).
 * 포트폴리오·순위 계산은 competition 도메인의 책임이라 목킹한다(재계산하지 않는다).
 */
const participantRow = {
  id: 'p1',
  nickname: '철수',
  pinHash: 'x',
  bio: '우량주 장기',
  avatarEmoji: '🚀',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
} as ParticipantRow;

const portfolio = {
  seasonId: 's1',
  totalValue: 1_100_000,
  totalProfitLoss: 100_000,
  totalProfitLossRate: 10,
  holdings: [{ code: '005930', name: '삼성전자' }],
};

const makeDeps = (rankEntryId: string | null) => {
  const prisma = {
    participant: { findUnique: vi.fn().mockResolvedValue(participantRow), update: vi.fn() },
    watchlistItem: { findMany: vi.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;

  const competition = {
    getPortfolio: vi.fn().mockResolvedValue(portfolio),
    listTrades: vi.fn().mockResolvedValue([{ id: 't1', code: '005930' }]),
  } as unknown as CompetitionService;

  const leaderboard = {
    getLeaderboard: vi.fn().mockResolvedValue({
      season: {},
      entries: rankEntryId ? [{ rank: 3, participantId: rankEntryId }] : [],
      at: '',
    }),
  } as unknown as LeaderboardService;

  return { prisma, competition, leaderboard, service: new ProfileService(prisma, competition, leaderboard) };
};

describe('ProfileService', () => {
  describe('getProfile', () => {
    it('순위는 리더보드에서 이 참가자 항목으로 채운다', async () => {
      const { service } = makeDeps('p1');
      const profile = await service.getProfile('p1');
      expect(profile.stats.rank).toBe(3);
    });

    it('리더보드에 없으면 순위는 null 이다', async () => {
      const { service } = makeDeps(null);
      const profile = await service.getProfile('p1');
      expect(profile.stats.rank).toBeNull();
    });

    it('요약 지표는 포트폴리오에서, 보유 수는 holdings 길이에서 온다', async () => {
      const { service } = makeDeps('p1');
      const profile = await service.getProfile('p1');
      expect(profile.stats.totalValue).toBe(1_100_000);
      expect(profile.stats.holdingCount).toBe(1);
      expect(profile.recentTrades).toHaveLength(1);
    });

    it('없는 참가자는 404 다', async () => {
      const { service, prisma } = makeDeps('p1');
      vi.mocked(prisma.participant.findUnique).mockResolvedValueOnce(null);
      await expect(service.getProfile('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateMine', () => {
    it('보낸 필드만 반영한다 — undefined 는 제외', async () => {
      const { service, prisma } = makeDeps('p1');
      await service.updateMine(participantRow, { bio: '새 소개' });
      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { bio: '새 소개' },
      });
    });

    it('null 은 "지움"으로 그대로 전달한다', async () => {
      const { service, prisma } = makeDeps('p1');
      await service.updateMine(participantRow, { avatarEmoji: null });
      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { avatarEmoji: null },
      });
    });
  });
});
