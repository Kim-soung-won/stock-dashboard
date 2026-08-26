import { API_ROUTES } from '@stock/contracts';
import { BaseService } from '../../base';
import { LeaderboardDtoSchemas } from './leaderboard-dto.contracts';
import type { LeaderboardDtoTypes } from './leaderboard-dto.types';

export const LeaderboardService = {
  /** 순위 스냅샷(공개). 실시간 갱신은 WS `leaderboard` 메시지가 담당한다. */
  fetchLeaderboard: (): Promise<LeaderboardDtoTypes.Leaderboard> =>
    BaseService.get(API_ROUTES.competition.leaderboard, LeaderboardDtoSchemas.leaderboard),

  /** 참가자별 총평가금액 추이(공개). 라인차트가 읽는다. */
  fetchHistory: (): Promise<LeaderboardDtoTypes.History> =>
    BaseService.get(API_ROUTES.competition.leaderboardHistory, LeaderboardDtoSchemas.history),
};
