import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Participant as ParticipantRow } from '@prisma/client';
import type { AuthSession, LoginRequest, Participant } from '@stock/contracts';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { hashPin, issueToken, verifyPin, verifyToken } from './auth.tokens';

/**
 * 참가자 인증.
 *
 * "닉네임이 처음이면 그 PIN 으로 참가(자동 등록), 이미 있으면 PIN 검증" 이라는
 * 단일 흐름이다. 별도 회원가입 단계를 두지 않는 것은 캐주얼 경쟁의 진입장벽을
 * 낮추기 위한 의도된 선택이다.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  async login(request: LoginRequest): Promise<AuthSession> {
    const existing = await this.prisma.participant.findUnique({
      where: { nickname: request.nickname },
    });

    const participant = existing ?? (await this.register(request));
    if (existing && !verifyPin(request.pin, existing.pinHash)) {
      // 닉네임은 맞고 PIN 이 틀린 경우. 존재 여부를 숨기지는 않는다(캐주얼).
      throw new UnauthorizedException('PIN 이 올바르지 않습니다');
    }

    const token = issueToken(participant.id, this.env.SESSION_SECRET, Date.now());
    return { token, participant: toParticipant(participant) };
  }

  /** 토큰 문자열 → 참가자. 유효하지 않으면 UnauthorizedException. 가드가 쓴다. */
  async authenticate(token: string): Promise<ParticipantRow> {
    const participantId = verifyToken(token, this.env.SESSION_SECRET, Date.now());
    if (!participantId) throw new UnauthorizedException('로그인이 필요합니다');
    const participant = await this.prisma.participant.findUnique({ where: { id: participantId } });
    if (!participant) throw new UnauthorizedException('로그인이 필요합니다');
    return participant;
  }

  private async register(request: LoginRequest): Promise<ParticipantRow> {
    const participant = await this.prisma.participant.create({
      data: { nickname: request.nickname, pinHash: hashPin(request.pin) },
    });
    this.logger.log(`새 참가자 등록: ${participant.nickname}`);
    return participant;
  }
}

export const toParticipant = (row: ParticipantRow): Participant => ({
  id: row.id,
  nickname: row.nickname,
  createdAt: row.createdAt.toISOString(),
  bio: row.bio,
  avatarEmoji: row.avatarEmoji,
});
