import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module';
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
