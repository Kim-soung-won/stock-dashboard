import { Module } from '@nestjs/common';
import { AccountEnabledGuard } from './account-enabled.guard';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountEnabledGuard],
  exports: [AccountService],
})
export class AccountModule {}
