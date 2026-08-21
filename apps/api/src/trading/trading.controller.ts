import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { ApiResponse, ListPayload, Orderability, OrderRecord } from '@stock/contracts';
import { cancelOrderRequestSchema, placeOrderRequestSchema } from '@stock/contracts';
import { z } from 'zod';
import { ok } from '../common/api-response';
import { TradingService } from './trading.service';

const orderabilityQuerySchema = z.object({ price: z.coerce.number().int().nonnegative() });

@Controller('api/trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('orders')
  async placeOrder(@Body() body: unknown): Promise<ApiResponse<OrderRecord>> {
    const request = placeOrderRequestSchema.parse(body);
    return ok(await this.tradingService.placeOrder(request));
  }

  @Post('orders/cancel')
  async cancelOrder(@Body() body: unknown): Promise<ApiResponse<OrderRecord>> {
    const request = cancelOrderRequestSchema.parse(body);
    return ok(await this.tradingService.cancelOrder(request));
  }

  @Get('orderability/:code')
  async orderability(
    @Param('code') code: string,
    @Query() query: unknown,
  ): Promise<ApiResponse<Orderability>> {
    const { price } = orderabilityQuerySchema.parse(query);
    return ok(await this.tradingService.getOrderability(code, price));
  }

  /** 우리 주문 저널. 키움 조회가 아니라 우리 DB 가 답한다(감사·재시도 판단용). */
  @Get('orders')
  async orders(): Promise<ApiResponse<ListPayload<OrderRecord>>> {
    const items = await this.tradingService.listOrders();
    return ok({ items, total: items.length, nextKey: null });
  }
}
