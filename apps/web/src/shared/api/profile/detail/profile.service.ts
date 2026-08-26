import { API_ROUTES } from '@stock/contracts';
import type { UpdateProfileRequest } from '@stock/contracts';
import { BaseService } from '../../base';
import { ProfileDtoSchemas } from './profile-dto.contracts';
import type { ProfileDtoTypes } from './profile-dto.types';

export const ProfileService = {
  /** 공개 프로필 조회(누구나). */
  fetchProfile: (participantId: string): Promise<ProfileDtoTypes.Profile> =>
    BaseService.get(API_ROUTES.profile.view(participantId), ProfileDtoSchemas.profile),

  /** 내 프로필(bio·아바타) 수정 — 갱신된 프로필을 돌려받는다. 인증 필요. */
  updateMine: (request: UpdateProfileRequest): Promise<ProfileDtoTypes.Profile> =>
    BaseService.patch(API_ROUTES.profile.updateMine, ProfileDtoSchemas.profile, request),
};
