import { API_ROUTES } from '@stock/contracts';
import { BaseService } from '../../base';
import { SeasonDtoSchemas } from './season-dto.contracts';
import type { SeasonDtoTypes } from './season-dto.types';

export const SeasonService = {
  /** 현재 활성 시즌(공개). */
  fetchSeason: (): Promise<SeasonDtoTypes.Season> =>
    BaseService.get(API_ROUTES.competition.season, SeasonDtoSchemas.season),
};
