import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Participant as ParticipantRow } from '@prisma/client';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { verifyToken } from '../auth/auth.tokens';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

interface AuthedRequest extends Request {
  /** AuthGuard 가 보호 라우트에서 붙여준다(비로그인/공개 라우트에는 없다). */
  participant?: ParticipantRow;
}

/**
 * 서비스 사용 이력 적재 (전역, HTTP 전용).
 *
 * 모든 HTTP 요청이 우리 BFF 한 곳(`/api/*`)을 지나므로 여기서 한 번만 기록하면 클라이언트
 * 사용 이력이 전부 잡힌다. 신원은 **토큰 우선 + 헤더 보완**:
 *  - 신뢰값 participantId — 가드가 붙인 참가자, 없으면 Bearer 토큰을 직접 검증(HMAC, DB 조회 없음).
 *  - 보조값 headerUserId — 클라이언트 `X-User-Id`(디바이스/익명 id, 위조 가능).
 *
 * 응답 완료(`res 'finish'`) 시점에 적재해 최종 상태코드·소요시간을 정확히 남기고,
 * 쓰기는 **비차단·베스트에포트**라 로깅 실패가 요청을 깨뜨리지 않는다. 요청 본문은 저장하지 않는다.
 */
@Injectable()
export class UsageLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UsageLoggingInterceptor.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<AuthedRequest>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();

    // 응답이 완전히 전송된 뒤 기록한다(예외 필터가 상태코드를 정한 이후).
    res.once('finish', () => {
      const participantId = req.participant?.id ?? this.participantFromToken(req);
      void this.prisma.serviceUsageLog
        .create({
          data: {
            participantId: participantId ?? null,
            headerUserId: this.header(req, 'x-user-id') ?? null,
            method: req.method,
            path: (req.originalUrl || req.url || '').split('?')[0]?.slice(0, 512) ?? '',
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            ip: this.clientIp(req),
            userAgent: this.header(req, 'user-agent')?.slice(0, 512) ?? null,
          },
        })
        .catch((error) => {
          this.logger.warn(`사용 이력 적재 실패: ${String(error)}`);
        });
    });

    return next.handle();
  }

  /** 공개 라우트라 가드가 없어도 토큰이 실려 있으면 신뢰값 id 를 얻는다. */
  private participantFromToken(req: Request): string | null {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return verifyToken(token, this.env.SESSION_SECRET, Date.now());
  }

  private clientIp(req: Request): string | null {
    const forwarded = this.header(req, 'x-forwarded-for')?.split(',')[0]?.trim();
    return (forwarded || req.ip || '').slice(0, 64) || null;
  }

  private header(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
