import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  providers: [RealtimeGateway],
  // 경쟁 모듈이 리더보드를 이 게이트웨이로 팬아웃한다.
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
