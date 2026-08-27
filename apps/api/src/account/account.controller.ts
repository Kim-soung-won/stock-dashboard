import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { ApiResponse, Balance, ListPayload, PendingOrder } from '@stock/contracts';
import { z } from 'zod';
import { ok } from '../common/api-response';
import { AccountEnabledGuard } from './account-enabled.guard';
import { AccountService } from './account.service';

const pendingQuerySchema = z.object({ code: z.string().min(6).max(12).optional() });

/** 실계좌 조회. `ACCOUNT_ENABLED=false` 면 가드가 전체를 막는다. */
@Controller('api/account')
@UseGuards(AccountEnabledGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('balance')
  async balance(): Promise<ApiResponse<Balance>> {
    return ok(await this.accountService.getBalance());
  }

  @Get('pending-orders')
  async pendingOrders(@Query() query: unknown): Promise<ApiResponse<ListPayload<PendingOrder>>> {
    const { code } = pendingQuerySchema.parse(query);
    const items = await this.accountService.getPendingOrders(code);
    return ok({ items, total: items.length, nextKey: null });
  }
}
