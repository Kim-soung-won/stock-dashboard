import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CompetitionController } from './competition.controller';
import { CompetitionService } from './competition.service';
import { LeaderboardService } from './leaderboard.service';
import { PricebookService } from './pricebook.service';
import { SeasonService } from './season.service';

/**
 * 모의투자 경쟁.
 *
 * - AuthModule: 매매·포트폴리오 라우트를 참가자 스코프로 보호(AuthGuard).
 * - MarketModule: 체결가·가격북 시딩용 시세 스냅샷(getQuote).
 * - RealtimeModule: 순위를 기존 WS 게이트웨이로 팬아웃.
 * KiwoomWsSession / PrismaService 는 전역 모듈에서 주입된다.
 */
@Module({
  imports: [AuthModule, MarketModule, RealtimeModule],
  controllers: [CompetitionController],
  providers: [SeasonService, PricebookService, LeaderboardService, CompetitionService],
  // 프로필(읽기 전용 합성 뷰)이 포트폴리오·순위를 재사용한다.
  exports: [CompetitionService, LeaderboardService],
})
export class CompetitionModule {}
