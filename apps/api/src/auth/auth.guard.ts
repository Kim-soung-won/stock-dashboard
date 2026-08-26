import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Participant as ParticipantRow } from '@prisma/client';
import type { Request } from 'express';
import { AuthService } from './auth.service';

interface AuthedRequest extends Request {
  participant?: ParticipantRow;
}

/**
 * Bearer 토큰 가드. `Authorization: Bearer <token>` 을 검증해 참가자를 요청에 붙인다.
 * 쿠키 대신 헤더를 쓰는 이유: 쿠키 파서 의존성 없이 프론트 localStorage 토큰과
 * 대칭을 이루기 위해서다.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('로그인이 필요합니다');
    }
    request.participant = await this.auth.authenticate(token);
    return true;
  }
}

/** 가드가 붙인 참가자를 컨트롤러 인자로 꺼낸다. */
export const CurrentParticipant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ParticipantRow => {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!request.participant) throw new UnauthorizedException('로그인이 필요합니다');
    return request.participant;
  },
);
