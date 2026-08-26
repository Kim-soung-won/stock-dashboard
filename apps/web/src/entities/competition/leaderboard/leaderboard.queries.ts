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
};
