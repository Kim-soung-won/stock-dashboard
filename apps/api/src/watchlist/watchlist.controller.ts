import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { Participant as ParticipantRow } from '@prisma/client';
import type { ApiResponse, ListPayload, WatchlistItem } from '@stock/contracts';
import { addWatchlistRequestSchema } from '@stock/contracts';
import { AuthGuard, CurrentParticipant } from '../auth/auth.guard';
import { ok } from '../common/api-response';
import { WatchlistService } from './watchlist.service';

/**
 * 관심 종목 — 전 라우트 참가자 스코프(AuthGuard). 목록·추가·삭제 모두 갱신된 전체
 * 목록을 돌려줘, 클라이언트가 별도 재조회 없이 캐시를 교체할 수 있게 한다.
 */
@Controller('api/watchlist')
@UseGuards(AuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  async list(
    @CurrentParticipant() participant: ParticipantRow,
  ): Promise<ApiResponse<ListPayload<WatchlistItem>>> {
    return ok(this.toList(await this.watchlist.list(participant.id)));
  }

  @Post()
  async add(
    @CurrentParticipant() participant: ParticipantRow,
    @Body() body: unknown,
  ): Promise<ApiResponse<ListPayload<WatchlistItem>>> {
    const request = addWatchlistRequestSchema.parse(body);
    return ok(this.toList(await this.watchlist.add(participant.id, request)));
  }

  @Delete(':code')
  async remove(
    @CurrentParticipant() participant: ParticipantRow,
    @Param('code') code: string,
  ): Promise<ApiResponse<ListPayload<WatchlistItem>>> {
    return ok(this.toList(await this.watchlist.remove(participant.id, code)));
  }

  private toList(items: WatchlistItem[]): ListPayload<WatchlistItem> {
    return { items, total: items.length, nextKey: null };
  }
}
