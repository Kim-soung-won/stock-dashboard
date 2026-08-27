import { Controller, Get, Inject } from '@nestjs/common';
import type { ApiResponse } from '@stock/contracts';
import { ENV, type Env } from '../config/env';
import { KiwoomWsSession } from '../kiwoom/kiwoom-ws.session';
import { ok } from './api-response';

interface Health {
  /** 현재 붙어 있는 키움 환경. real 이면 실주문이 나간다. */
  kiwoomEnv: 'mock' | 'real';
  upstream: 'connecting' | 'ready' | 'disconnected';
  subscribedCodes: number;
  /** 실계좌 조회 기능 활성 여부(ACCOUNT_ENABLED). */
  accountEnabled: boolean;
}

@Controller('api/health')
export class HealthController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly session: KiwoomWsSession,
  ) {}

  @Get()
  health(): ApiResponse<Health> {
    return ok({
      kiwoomEnv: this.env.KIWOOM_ENV,
      upstream: this.session.currentState,
      subscribedCodes: this.session.subscribedCount,
      accountEnabled: this.env.ACCOUNT_ENABLED,
    });
  }
}
