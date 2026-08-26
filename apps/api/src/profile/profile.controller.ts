import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import type { Participant as ParticipantRow } from '@prisma/client';
import type { ApiResponse, ParticipantProfile } from '@stock/contracts';
import { updateProfileRequestSchema } from '@stock/contracts';
import { AuthGuard, CurrentParticipant } from '../auth/auth.guard';
import { ok } from '../common/api-response';
import { ProfileService } from './profile.service';

/**
 * 프로필. 조회는 공개(리더보드와 같은 공개 수준), 편집은 본인만.
 */
@Controller('api')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  /** 공개 프로필 조회(SNS) — 누구나. */
  @Get('participants/:id/profile')
  async view(@Param('id') id: string): Promise<ApiResponse<ParticipantProfile>> {
    return ok(await this.profile.getProfile(id));
  }

  /** 내 프로필(bio·아바타) 수정 — 인증. */
  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateMine(
    @CurrentParticipant() participant: ParticipantRow,
    @Body() body: unknown,
  ): Promise<ApiResponse<ParticipantProfile>> {
    const request = updateProfileRequestSchema.parse(body);
    return ok(await this.profile.updateMine(participant, request));
  }
}
