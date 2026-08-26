import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { Participant as ParticipantRow } from '@prisma/client';
import type {
  ApiResponse,
  Leaderboard,
  ListPayload,
  PaperTrade,
  Portfolio,
  Season,
  TradeResult,
} from '@stock/contracts';
import { tradeRequestSchema } from '@stock/contracts';
import { CurrentParticipant, AuthGuard } from '../auth/auth.guard';
import { ok } from '../common/api-response';
import { CompetitionService } from './competition.service';
import { LeaderboardService } from './leaderboard.service';

@Controller('api/competition')
export class CompetitionController {
  constructor(
    private readonly competition: CompetitionService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  /** 현재 활성 시즌 (공개). */
  @Get('season')
  async season(): Promise<ApiResponse<Season>> {
    return ok(await this.competition.getSeason());
  }

  /** 전체 순위 (공개). 실시간 갱신은 WS `leaderboard` 메시지가 담당한다. */
  @Get('leaderboard')
  async leaderboardSnapshot(): Promise<ApiResponse<Leaderboard>> {
    return ok(await this.leaderboard.getLeaderboard());
  }

  /** 내 포트폴리오 (인증). */
  @Get('portfolio')
  @UseGuards(AuthGuard)
  async portfolio(@CurrentParticipant() participant: ParticipantRow): Promise<ApiResponse<Portfolio>> {
    return ok(await this.competition.getPortfolio(participant));
  }

  /** 시장가 매매 (인증). */
  @Post('trade')
  @UseGuards(AuthGuard)
  async trade(
    @CurrentParticipant() participant: ParticipantRow,
    @Body() body: unknown,
  ): Promise<ApiResponse<TradeResult>> {
    const request = tradeRequestSchema.parse(body);
    return ok(await this.competition.trade(participant, request));
  }

  /** 내 체결 이력 (인증). */
  @Get('trades')
  @UseGuards(AuthGuard)
  async trades(
    @CurrentParticipant() participant: ParticipantRow,
  ): Promise<ApiResponse<ListPayload<PaperTrade>>> {
    const items = await this.competition.listTrades(participant);
    return ok({ items, total: items.length, nextKey: null });
  }
}
