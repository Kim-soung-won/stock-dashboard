import { queryOptions } from '@tanstack/react-query';
import { LeaderboardService } from '@/shared/api/competition/leaderboard';

export const leaderboardQueries = {
  all: () => ['competition', 'leaderboard'] as const,

  /**
   * 순위 스냅샷. 최초 1회만 REST 로 받고, 이후 갱신은 WS `leaderboard` 메시지가
   * 이 캐시에 직접 써 넣는다(useLeaderboardStream). refetchInterval 을 두지 않는다.
   */
  current: () =>
    queryOptions({
      queryKey: [...leaderboardQueries.all(), 'current'],
      queryFn: () => LeaderboardService.fetchLeaderboard(),
      staleTime: Infinity,
    }),

  /**
   * 총평가금액 추이. 스냅샷은 서버가 성기게(수 분 주기) 쌓으므로 자주 다시 부를 필요가 없다.
   * WS 로 실시간 갱신되는 순위표와 달리, 이 곡선은 새 스냅샷이 쌓였을 때만 의미가 바뀐다.
   */
  history: () =>
    queryOptions({
      queryKey: [...leaderboardQueries.all(), 'history'],
      queryFn: () => LeaderboardService.fetchHistory(),
      staleTime: 60_000,
    }),
};
