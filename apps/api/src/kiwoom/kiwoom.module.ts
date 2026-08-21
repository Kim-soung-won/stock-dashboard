import { Global, Module } from '@nestjs/common';
import { ENV, loadEnv } from '../config/env';
import { KiwoomRestClient } from './kiwoom-rest.client';
import { KiwoomTokenService } from './kiwoom-token.service';
import { KiwoomWsSession } from './kiwoom-ws.session';

/**
 * 키움 게이트웨이. 도메인 모듈(market/account/trading)은 이 모듈만 의존하고
 * 키움의 snake_case 나 헤더 규약을 직접 알지 못한다.
 */
@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: loadEnv },
    KiwoomTokenService,
    KiwoomRestClient,
    KiwoomWsSession,
  ],
  exports: [ENV, KiwoomTokenService, KiwoomRestClient, KiwoomWsSession],
})
export class KiwoomModule {}
