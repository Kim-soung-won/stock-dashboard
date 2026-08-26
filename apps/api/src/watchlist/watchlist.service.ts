import { Injectable } from '@nestjs/common';
import type { WatchlistItem as WatchlistRow } from '@prisma/client';
import type { AddWatchlistRequest, WatchlistItem } from '@stock/contracts';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 관심 종목 서비스.
 *
 * 우리 DB 가 진실이다(키움 API 를 쓰지 않는다). 시세는 저장하지 않고 코드+이름 스냅샷만
 * 담으며, 현재가는 프론트가 조회 시점에 실시간으로 붙인다. 모든 메서드는 참가자 스코프다.
 */
@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  /** 담은 순서(오래된 것 먼저)로 목록을 돌려준다. */
  async list(participantId: string): Promise<WatchlistItem[]> {
    const rows = await this.prisma.watchlistItem.findMany({
      where: { participantId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toWatchlistItem);
  }

  /**
   * 추가(멱등). 같은 종목을 두 번 담아도 에러 없이 무시한다.
   * 이름이 오지 않으면 종목 캐시에서 채워 표시용 스냅샷을 남긴다(없으면 null).
   */
  async add(participantId: string, request: AddWatchlistRequest): Promise<WatchlistItem[]> {
    const name = request.name ?? (await this.lookupName(request.code));
    await this.prisma.watchlistItem.upsert({
      where: { participantId_code: { participantId, code: request.code } },
      create: { participantId, code: request.code, name },
      update: {}, // 이미 있으면 그대로 둔다(중복 추가 무시).
    });
    return this.list(participantId);
  }

  /** 삭제(멱등). 없는 종목을 지워도 에러가 아니다. */
  async remove(participantId: string, code: string): Promise<WatchlistItem[]> {
    await this.prisma.watchlistItem.deleteMany({ where: { participantId, code } });
    return this.list(participantId);
  }

  /** 종목 마스터 캐시에서 이름을 찾는다(시장 구분은 여러 개일 수 있어 첫 건을 쓴다). */
  private async lookupName(code: string): Promise<string | null> {
    const cached = await this.prisma.symbolCache.findFirst({ where: { code } });
    return cached?.name ?? null;
  }
}

const toWatchlistItem = (row: WatchlistRow): WatchlistItem => ({
  code: row.code,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});
