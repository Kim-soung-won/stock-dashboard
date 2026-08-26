import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { Participant as ParticipantRow } from '@prisma/client';
import type { ApiResponse, AuthSession, Participant } from '@stock/contracts';
import { loginRequestSchema } from '@stock/contracts';
import { ok } from '../common/api-response';
import { AuthService, toParticipant } from './auth.service';
import { CurrentParticipant, AuthGuard } from './auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 닉네임+PIN 으로 참가(신규)하거나 로그인(기존). Bearer 토큰을 돌려준다. */
  @Post('login')
  async login(@Body() body: unknown): Promise<ApiResponse<AuthSession>> {
    const request = loginRequestSchema.parse(body);
    return ok(await this.auth.login(request));
  }

  /** 현재 토큰의 참가자. 프론트가 새로고침 후 세션 유효성을 확인하는 용도. */
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentParticipant() participant: ParticipantRow): ApiResponse<Participant> {
    return ok(toParticipant(participant));
  }
}
