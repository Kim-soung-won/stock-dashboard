import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../config/env';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashPin } from './auth.tokens';

/**
 * 인증 계약: "닉네임이 처음이면 참가(자동 등록), 있으면 PIN 검증".
 *  - 새 닉네임 → 참가자 생성 + 토큰 발급.
 *  - 기존 닉네임 + 맞는 PIN → 토큰 발급.
 *  - 기존 닉네임 + 틀린 PIN → 401(토큰 없음).
 *  - authenticate: 유효 토큰 → 참가자, 위조/만료 → 401.
 * PIN 해시·토큰 서명은 실제 crypto 로 검증하고, DB 만 목킹한다.
 */
const env = { SESSION_SECRET: 'unit-secret' } as unknown as Env;

const row = (over: Partial<{ id: string; nickname: string; pinHash: string }> = {}) => ({
  id: over.id ?? 'p1',
  nickname: over.nickname ?? '철수',
  pinHash: over.pinHash ?? hashPin('1234'),
  bio: null,
  avatarEmoji: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
});

const makePrisma = () =>
  ({
    participant: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  }) as unknown as PrismaService;

describe('AuthService.login', () => {
  let prisma: PrismaService;
  let service: AuthService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AuthService(env, prisma);
  });

  it('새 닉네임이면 참가자를 만들고 토큰을 발급한다', async () => {
    vi.mocked(prisma.participant.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.participant.create).mockResolvedValue(row({ nickname: '영희' }) as never);

    const session = await service.login({ nickname: '영희', pin: '1234' });

    expect(prisma.participant.create).toHaveBeenCalled();
    expect(session.token).toMatch(/.+\..+/); // payload.signature 형태
    expect(session.participant.nickname).toBe('영희'); // create 목이 돌려준 행
  });

  it('기존 닉네임 + 맞는 PIN 이면 토큰을 발급한다', async () => {
    vi.mocked(prisma.participant.findUnique).mockResolvedValue(row({ pinHash: hashPin('4321') }) as never);
    const session = await service.login({ nickname: '철수', pin: '4321' });
    expect(session.token.length).toBeGreaterThan(0);
    expect(prisma.participant.create).not.toHaveBeenCalled();
  });

  it('기존 닉네임 + 틀린 PIN 이면 401 이고 토큰을 만들지 않는다', async () => {
    vi.mocked(prisma.participant.findUnique).mockResolvedValue(row({ pinHash: hashPin('0000') }) as never);
    await expect(service.login({ nickname: '철수', pin: '9999' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('AuthService.authenticate', () => {
  let prisma: PrismaService;
  let service: AuthService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AuthService(env, prisma);
  });

  it('유효 토큰이면 참가자를 돌려준다', async () => {
    vi.mocked(prisma.participant.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.participant.create).mockResolvedValue(row() as never);
    const { token } = await service.login({ nickname: '철수', pin: '1234' });

    vi.mocked(prisma.participant.findUnique).mockResolvedValue(row() as never);
    const participant = await service.authenticate(token);
    expect(participant.id).toBe('p1');
  });

  it('위조/형식 오류 토큰은 401 이다', async () => {
    await expect(service.authenticate('not-a-real-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
