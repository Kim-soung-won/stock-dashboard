import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { CompetitionModule } from './competition/competition.module';
import { HealthController } from './common/health.controller';
import { KiwoomModule } from './kiwoom/kiwoom.module';
import { MarketModule } from './market/market.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { TradingModule } from './trading/trading.module';

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
  ],
  controllers: [HealthController],
})
export class AppModule {}
