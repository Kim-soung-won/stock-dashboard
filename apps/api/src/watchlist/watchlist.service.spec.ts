import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { WatchlistService } from './watchlist.service';

/**
 * 관심종목 서비스의 계약을 고정한다(구현이 아니라 약속).
 *  - 추가는 멱등이다(upsert update:{} — 중복 추가는 무시).
 *  - 이름이 없으면 종목 캐시에서 채운다.
 *  - 삭제는 멱등이다(deleteMany — 없어도 에러 아님).
 *  - 노출 형태는 code·name·createdAt(ISO)뿐.
 * DB 에는 붙지 않는다 — Prisma 는 목킹한다.
 */
const CREATED_AT = new Date('2026-08-26T00:00:00.000Z');

const makePrisma = () =>
  ({
    watchlistItem: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: 'w1', participantId: 'p1', code: '005930', name: '삼성전자', createdAt: CREATED_AT },
        ]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    symbolCache: { findFirst: vi.fn().mockResolvedValue({ name: '카카오' }) },
  }) as unknown as PrismaService;

describe('WatchlistService', () => {
  let prisma: PrismaService;
  let service: WatchlistService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new WatchlistService(prisma);
  });

  it('list 는 code·name·createdAt(ISO) 만 노출한다', async () => {
    const items = await service.list('p1');
    expect(items).toEqual([
      { code: '005930', name: '삼성전자', createdAt: CREATED_AT.toISOString() },
    ]);
  });

  it('추가는 멱등이다 — upsert 의 update 는 비어 있어 중복 추가를 무시한다', async () => {
    await service.add('p1', { code: '005930', name: '삼성전자' });
    expect(prisma.watchlistItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { participantId_code: { participantId: 'p1', code: '005930' } },
        update: {},
      }),
    );
  });

  it('이름이 없으면 종목 캐시에서 채워 담는다', async () => {
    await service.add('p1', { code: '035720' });
    expect(prisma.symbolCache.findFirst).toHaveBeenCalledWith({ where: { code: '035720' } });
    expect(prisma.watchlistItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { participantId: 'p1', code: '035720', name: '카카오' } }),
    );
  });

  it('이름을 주면 캐시 조회 없이 그 이름으로 담는다', async () => {
    await service.add('p1', { code: '035720', name: '카카오게임즈' });
    expect(prisma.symbolCache.findFirst).not.toHaveBeenCalled();
    expect(prisma.watchlistItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { participantId: 'p1', code: '035720', name: '카카오게임즈' },
      }),
    );
  });

  it('삭제는 deleteMany 로 멱등하게 처리하고 갱신된 목록을 돌려준다', async () => {
    const items = await service.remove('p1', '005930');
    expect(prisma.watchlistItem.deleteMany).toHaveBeenCalledWith({
      where: { participantId: 'p1', code: '005930' },
    });
    expect(items).toHaveLength(1);
  });
});
