import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  API_ROUTES,
  candleIntervalSchema,
  marketKindSchema,
  rankingKindSchema,
  rankingMarketSchema,
} from '@stock/contracts';
import type {
  ApiResponse,
  Candle,
  ListPayload,
  OrderBook,
  Quote,
  RankingItem,
  StockSymbol,
} from '@stock/contracts';
import { z } from 'zod';
import { ok } from '../common/api-response';
import { MarketService } from './market.service';

const symbolsQuerySchema = z.object({
  market: marketKindSchema.default('kospi'),
});

const candlesQuerySchema = z.object({
  interval: candleIntervalSchema.default('day'),
  baseDate: z.string().regex(/^\d{8}$/).optional(),
});

const rankingQuerySchema = z.object({
  market: rankingMarketSchema.default('all'),
});

@Controller('api/market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('symbols')
  async symbols(@Query() query: unknown): Promise<ApiResponse<ListPayload<StockSymbol>>> {
    const { market } = symbolsQuerySchema.parse(query);
    const items = await this.marketService.getSymbols(market);
    return ok({ items, total: items.length, nextKey: null });
  }

  @Get('quote/:code')
  async quote(@Param('code') code: string): Promise<ApiResponse<Quote>> {
    return ok(await this.marketService.getQuote(code));
  }

  @Get('candles/:code')
  async candles(
    @Param('code') code: string,
    @Query() query: unknown,
  ): Promise<ApiResponse<ListPayload<Candle>>> {
    const { interval, baseDate } = candlesQuerySchema.parse(query);
    const items = await this.marketService.getCandles(code, interval, baseDate);
    return ok({ items, total: items.length, nextKey: null });
  }

  /** 순위(인기). kind = views | volume | value | gainers | losers */
  @Get('ranking/:kind')
  async ranking(
    @Param('kind') kind: string,
    @Query() query: unknown,
  ): Promise<ApiResponse<ListPayload<RankingItem>>> {
    const parsedKind = rankingKindSchema.parse(kind);
    const { market } = rankingQuerySchema.parse(query);
    const items = await this.marketService.getRanking(parsedKind, market);
    return ok({ items, total: items.length, nextKey: null });
  }

  @Get('order-book/:code')
  async orderBook(@Param('code') code: string): Promise<ApiResponse<OrderBook>> {
    return ok(await this.marketService.getOrderBook(code));
  }
}

/** 라우트 상수와 실제 경로가 어긋나지 않는지 컴파일 타임에 묶어둔다. */
export const MARKET_ROUTES = API_ROUTES.market;
