import { EventEmitter } from 'node:events';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { issueToken } from '../auth/auth.tokens';
import type { Env } from '../config/env';
import type { PrismaService } from '../prisma/prisma.service';
import { UsageLoggingInterceptor } from './usage-logging.interceptor';

/**
 * 사용 이력 인터셉터의 신원 해석 계약을 고정한다.
 *  - 신뢰값 participantId: 가드가 붙인 참가자 > Bearer 토큰 검증 > null.
 *  - 보조값 headerUserId: X-User-Id 헤더.
 *  - 경로는 쿼리스트링을 뗀다. HTTP 가 아니면 로깅하지 않는다.
 * ExecutionContext·응답은 목킹하고, 토큰은 실제 서명으로 만든다(파싱까지 함께 검증).
 */
const SECRET = 'test-secret';
const env = { SESSION_SECRET: SECRET } as unknown as Env;

const next: CallHandler = { handle: () => of(null) };

const makeRes = () => Object.assign(new EventEmitter(), { statusCode: 200 });

const makeCtx = (req: unknown, res: unknown, type: 'http' | 'ws' = 'http') =>
  ({
    getType: () => type,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  }) as unknown as ExecutionContext;

describe('UsageLoggingInterceptor', () => {
  let prisma: PrismaService;
  let create: ReturnType<typeof vi.fn>;
  let interceptor: UsageLoggingInterceptor;

  beforeEach(() => {
    create = vi.fn().mockResolvedValue({});
    prisma = { serviceUsageLog: { create } } as unknown as PrismaService;
    interceptor = new UsageLoggingInterceptor(env, prisma);
  });

  it('가드가 붙인 참가자를 신뢰 id 로, 헤더는 보조 id 로 남기고 쿼리스트링은 뗀다', () => {
    const req = {
      participant: { id: 'p1' },
      method: 'GET',
      originalUrl: '/api/watchlist?x=1',
      headers: { 'x-user-id': 'dev1', 'user-agent': 'UA' },
      ip: '1.2.3.4',
    };
    const res = makeRes();

    interceptor.intercept(makeCtx(req, res), next);
    res.emit('finish');

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        participantId: 'p1',
        headerUserId: 'dev1',
        method: 'GET',
        path: '/api/watchlist',
        statusCode: 200,
        ip: '1.2.3.4',
        userAgent: 'UA',
        durationMs: expect.any(Number),
      }),
    });
  });

  it('비로그인이라도 Bearer 토큰이 있으면 토큰에서 신뢰 id 를 얻는다', () => {
    const token = issueToken('p2', SECRET, Date.now());
    const req = {
      method: 'POST',
      url: '/api/profile',
      headers: { authorization: `Bearer ${token}` },
    };
    const res = makeRes();

    interceptor.intercept(makeCtx(req, res), next);
    res.emit('finish');

    const data = create.mock.calls[0]?.[0].data;
    expect(data.participantId).toBe('p2');
    expect(data.headerUserId).toBeNull();
  });

  it('토큰도 없으면 participantId 는 null, 헤더 id 로만 귀속한다', () => {
    const req = { method: 'GET', url: '/api/market/symbols', headers: { 'x-user-id': 'anon9' } };
    const res = makeRes();

    interceptor.intercept(makeCtx(req, res), next);
    res.emit('finish');

    const data = create.mock.calls[0]?.[0].data;
    expect(data.participantId).toBeNull();
    expect(data.headerUserId).toBe('anon9');
  });

  it('HTTP 가 아니면 로깅하지 않는다', () => {
    interceptor.intercept(makeCtx({}, makeRes(), 'ws'), next);
    expect(create).not.toHaveBeenCalled();
  });
});
