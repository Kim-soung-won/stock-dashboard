import { Module } from '@nestjs/common';
import { OrderJournalService } from './order-journal.service';
import { OrderTrackerService } from './order-tracker.service';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';

@Module({
  controllers: [TradingController],
  providers: [TradingService, OrderJournalService, OrderTrackerService],
  exports: [TradingService, OrderJournalService],
})
export class TradingModule {}
