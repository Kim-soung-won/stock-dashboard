import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { CompetitionModule } from './competition/competition.module';
import { HealthController } from './common/health.controller';
import { KiwoomModule } from './kiwoom/kiwoom.module';
import { MarketModule } from './market/market.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { TradingModule } from './trading/trading.module';
import { UsageLoggingInterceptor } from './common/usage-logging.interceptor';
import { WatchlistModule } from './watchlist/watchlist.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    KiwoomModule,
    PrismaModule,
    MarketModule,
    AccountModule,
    TradingModule,
    RealtimeModule,
    AuthModule,
    CompetitionModule,
    WatchlistModule,
    ProfileModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: UsageLoggingInterceptor }],
})
export class AppModule {}
