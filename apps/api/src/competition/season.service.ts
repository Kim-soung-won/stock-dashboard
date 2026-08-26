import { BadRequestException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { Season as SeasonRow } from '@prisma/client';
import type { Season, SeasonStatus } from '@stock/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { SEASON_DURATION_DAYS, STARTING_CASH } from './competition.constants';

/**
 * 시즌 관리.
 *
 * 동시에 활성 시즌은 하나만 둔다. 기동 시 활성 시즌이 없으면 기본 시즌을 자동 생성해
 * (별도 관리 화면 없이) 바로 경쟁을 시작할 수 있게 한다. 종료된 시즌은 순위가
 * 확정되고 더 이상 체결되지 않는다.
 */
@Injectable()
export class SeasonService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeasonService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    const active = await this.prisma.season.findFirst({ where: { status: 'active' } });
    if (!active) await this.createDefaultSeason();
  }

  /** 현재 활성 시즌 행. 없으면 만들어서라도 하나를 보장한다. */
  async getActiveSeasonRow(): Promise<SeasonRow> {
    const active = await this.prisma.season.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    return active ?? (await this.createDefaultSeason());
  }

  /** 체결 가능 여부. 시즌 창 밖(시작 전·종료 후)이면 거부한다. */
  assertTradable(season: SeasonRow, now: number): void {
    if (now < season.startAt.getTime()) {
      throw new BadRequestException('시즌이 아직 시작되지 않았습니다');
    }
    if (now > season.endAt.getTime()) {
      throw new BadRequestException('시즌이 종료되어 더 이상 매매할 수 없습니다');
    }
  }

  private async createDefaultSeason(): Promise<SeasonRow> {
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const season = await this.prisma.season.create({
      data: {
        name: '시즌 1',
        startingCash: STARTING_CASH,
        startAt,
        endAt,
        status: 'active',
      },
    });
    this.logger.log(`기본 시즌 생성: ${season.name} (~${endAt.toISOString().slice(0, 10)})`);
    return season;
  }
}

/** Prisma row → 계약. status 는 현재 시각 기준으로 계산한다. */
export const toSeason = (row: SeasonRow, now: number): Season => ({
  id: row.id,
  name: row.name,
  startingCash: row.startingCash,
  startAt: row.startAt.toISOString(),
  endAt: row.endAt.toISOString(),
  status: computeStatus(row, now),
});

const computeStatus = (row: SeasonRow, now: number): SeasonStatus => {
  if (now < row.startAt.getTime()) return 'upcoming';
  if (now > row.endAt.getTime()) return 'ended';
  return 'active';
};
