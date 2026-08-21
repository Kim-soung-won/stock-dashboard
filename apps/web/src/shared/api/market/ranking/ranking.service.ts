import { API_ROUTES } from '@stock/contracts';
import type { RankingKind, RankingMarket } from '@stock/contracts';
import { BaseService } from '../../base';
import { RankingDtoSchemas } from './ranking-dto.contracts';
import type { RankingDtoTypes } from './ranking-dto.types';

export const RankingService = {
  /** 순위(인기). 종류마다 다른 키움 TR 을 BFF 가 하나의 형태로 맞춰 준다. */
  fetchRanking: (kind: RankingKind, market: RankingMarket): Promise<RankingDtoTypes.List> =>
    BaseService.get(
      API_ROUTES.market.ranking(kind) + '?market=' + market,
      RankingDtoSchemas.list,
    ),
};
